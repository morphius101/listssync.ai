import { 
  ChecklistDTO, 
  TaskDTO, 
  ChecklistSummaryDTO, 
  VerificationDTO,
  MailingListSubscriptionDTO,
  UserDTO,
  User,
  UpsertUser,
  SubscriptionTier,
  TIER_LIMITS,
  SmsConsentDTO,
  checklists, 
  tasks,
  verifications,
  mailingListSubscriptions,
  users,
  smsConsents
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface IStorage {
  getAllChecklists(userId?: string): Promise<ChecklistSummaryDTO[]>;
  getChecklistById(id: string): Promise<ChecklistDTO | undefined>;
  createChecklist(checklist: ChecklistDTO): Promise<ChecklistSummaryDTO>;
  updateChecklist(checklist: ChecklistDTO): Promise<ChecklistDTO | undefined>;
  deleteChecklist(id: string): Promise<boolean>;
  updateTask(checklistId: string, taskId: string, updates: Partial<TaskDTO>): Promise<TaskDTO | undefined>;
  
  // Verification methods for scalable access control
  createVerification(verification: VerificationDTO): Promise<VerificationDTO>;
  getVerificationByToken(token: string): Promise<VerificationDTO | undefined>;
  markVerificationAsVerified(token: string): Promise<boolean>;
  updateVerificationCode(token: string, code: string): Promise<boolean>;
  getAllVerifications(): Promise<VerificationDTO[]>;
  
  // Mailing list methods for marketing campaigns
  subscribeToMailingList(subscription: MailingListSubscriptionDTO): Promise<MailingListSubscriptionDTO>;
  confirmMailingListSubscription(token: string): Promise<boolean>;
  getMailingListSubscription(email: string): Promise<MailingListSubscriptionDTO | undefined>;
  
  // User management methods for subscription tiers
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSubscription(userId: string, tier: SubscriptionTier, stripeData?: {
    customerId?: string;
    subscriptionId?: string;
    status?: string;
    endsAt?: Date;
  }): Promise<User | undefined>;
  incrementUserUsage(userId: string, type: 'sync' | 'language'): Promise<boolean>;
  checkUserLimits(userId: string, action: 'create_list' | 'translate' | 'sync'): Promise<{
    allowed: boolean;
    limit?: number;
    current?: number;
    tier: SubscriptionTier;
  }>;
  
  // SMS consent methods for Twilio compliance
  recordSmsConsent(consent: SmsConsentDTO): Promise<SmsConsentDTO>;
  getSmsConsent(phoneNumber: string): Promise<SmsConsentDTO | undefined>;
  revokeSmsConsent(phoneNumber: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {

  async getAllChecklists(userId?: string): Promise<ChecklistSummaryDTO[]> {
    // Base query
    let dbChecklists;
    
    // If userId is provided, filter checklists by user
    if (userId) {
      dbChecklists = await db.select().from(checklists).where(eq(checklists.userId, userId));
    } else {
      dbChecklists = await db.select().from(checklists);
    }
    
    return dbChecklists.map(checklist => {
      const tasksData = checklist.tasksData as TaskDTO[] || [];
      
      return {
        id: checklist.id.toString(),
        name: checklist.name,
        status: checklist.status as 'not-started' | 'in-progress' | 'completed',
        progress: checklist.progress,
        taskCount: tasksData.length,
        createdAt: checklist.createdAt,
        updatedAt: checklist.updatedAt
      };
    });
  }

  async getChecklistById(id: string): Promise<ChecklistDTO | undefined> {
    console.log(`🔍 Attempting to fetch checklist with ID: ${id}`);
    
    try {
      // First attempt: Try fetching by exact string ID match (supports both numeric and Firebase IDs)
      try {
        console.log(`Trying to fetch checklist with exact ID: ${id}`);
        const [dbChecklist] = await db.select().from(checklists).where(eq(checklists.id, id));
        
        if (dbChecklist) {
          console.log(`✅ Found checklist by exact ID: ${id}`);
          const tasksData = dbChecklist.tasksData as TaskDTO[] || [];
          
          return {
            id: dbChecklist.id,
            name: dbChecklist.name,
            tasks: tasksData,
            status: dbChecklist.status as 'not-started' | 'in-progress' | 'completed',
            progress: dbChecklist.progress,
            createdAt: dbChecklist.createdAt,
            updatedAt: dbChecklist.updatedAt,
            remarks: dbChecklist.remarks || "",
            userId: dbChecklist.userId || undefined
          };
        }
      } catch (directError: any) {
        console.log(`❌ Error finding checklist by exact ID: ${directError.message}`);
      }
      
      // Second attempt: Try fetching by share token
      try {
        console.log(`Trying to fetch checklist by share token: ${id}`);
        const [tokenChecklist] = await db.select().from(checklists).where(eq(checklists.shareToken, id));
        
        if (tokenChecklist) {
          console.log(`✅ Found checklist by share token: ${id}`);
          const tasksData = tokenChecklist.tasksData as TaskDTO[] || [];
          
          return {
            id: id, // Use the share token as the ID for consistency
            name: tokenChecklist.name,
            tasks: tasksData,
            status: tokenChecklist.status as 'not-started' | 'in-progress' | 'completed',
            progress: tokenChecklist.progress,
            createdAt: tokenChecklist.createdAt,
            updatedAt: tokenChecklist.updatedAt,
            remarks: tokenChecklist.remarks || "",
            userId: tokenChecklist.userId || undefined
          };
        }
      } catch (tokenError: any) {
        console.log(`❌ Error finding checklist by share token: ${tokenError.message}`);
      }
      
      // Third attempt: Check verifications table
      try {
        console.log(`Checking verifications table for token: ${id}`);
        const [verification] = await db.select()
          .from(verifications)
          .where(eq(verifications.token, id))
          .limit(1);
          
        if (verification && verification.checklistId) {
          console.log(`✅ Found verification with checklist ID: ${verification.checklistId}`);
          
          // First try to determine if verification.checklistId is numeric
          if (!isNaN(parseInt(verification.checklistId)) && verification.checklistId.match(/^\d+$/)) {
            try {
              const [linkedChecklist] = await db.select()
                .from(checklists)
                .where(eq(checklists.id, parseInt(verification.checklistId)));
                
              if (linkedChecklist) {
                console.log(`✅ Found checklist via verification link: ${verification.checklistId}`);
                const tasksData = linkedChecklist.tasksData as TaskDTO[] || [];
                
                return {
                  id: linkedChecklist.id.toString(),
                  name: linkedChecklist.name,
                  tasks: tasksData,
                  status: linkedChecklist.status as 'not-started' | 'in-progress' | 'completed',
                  progress: linkedChecklist.progress,
                  createdAt: linkedChecklist.createdAt,
                  updatedAt: linkedChecklist.updatedAt,
                  remarks: linkedChecklist.remarks || "",
                  userId: linkedChecklist.userId || undefined
                };
              }
            } catch (linkedError: any) {
              console.log(`❌ Error finding linked checklist by ID: ${linkedError.message}`);
            }
          } else {
            // If it's not numeric, it might be a Firebase ID or token
            console.log(`⚠️ Non-numeric checklist ID in verification: ${verification.checklistId}`);
            return {
              id: verification.checklistId,
              name: "Shared Checklist",
              tasks: [],
              status: 'not-started' as 'not-started',
              progress: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              remarks: "This checklist was shared with you. The data will be loaded from Firebase.",
              userId: undefined
            };
          }
        }
      } catch (verificationError: any) {
        console.log(`❌ Error checking verification: ${verificationError.message}`);
      }
      
      console.log(`❌ Checklist not found with ID: ${id}`);
      return undefined;
    } catch (error: any) {
      console.error(`❌ Error in getChecklistById: ${error.message}`);
      return undefined;
    }
  }

  async createChecklist(checklist: ChecklistDTO): Promise<ChecklistSummaryDTO> {
    // Format tasks for storage as JSON
    const tasksWithIds = checklist.tasks.map(task => 
      task.id ? task : { ...task, id: uuidv4() }
    );
    
    // Handle string IDs by storing them as shareToken
    const isStringId = isNaN(parseInt(checklist.id)) || !checklist.id.match(/^\d+$/);
    
    // Insert the checklist
    const [insertedChecklist] = await db.insert(checklists).values({
      name: checklist.name,
      status: checklist.status,
      progress: checklist.progress,
      remarks: checklist.remarks || "",
      tasksData: tasksWithIds,
      userId: checklist.userId,
      shareToken: isStringId ? checklist.id : null
    }).returning();
    
    // Return the checklist summary with the appropriate ID
    return {
      id: isStringId ? checklist.id : insertedChecklist.id.toString(),
      name: insertedChecklist.name,
      status: insertedChecklist.status as 'not-started' | 'in-progress' | 'completed',
      progress: insertedChecklist.progress,
      taskCount: tasksWithIds.length,
      createdAt: insertedChecklist.createdAt,
      updatedAt: insertedChecklist.updatedAt
    };
  }

  async updateChecklist(checklist: ChecklistDTO): Promise<ChecklistDTO | undefined> {
    // Only proceed if this is a numeric ID
    if (!isNaN(parseInt(checklist.id)) && checklist.id.match(/^\d+$/)) {
      const checklistId = parseInt(checklist.id);
      
      // Check if checklist exists
      try {
        const [existingChecklist] = await db.select().from(checklists).where(eq(checklists.id, checklistId));
        
        if (!existingChecklist) {
          return undefined;
        }
        
        // Update the checklist
        const [updatedChecklist] = await db.update(checklists)
          .set({
            name: checklist.name,
            status: checklist.status,
            progress: checklist.progress,
            remarks: checklist.remarks,
            tasksData: checklist.tasks,
            updatedAt: new Date()
          })
          .where(eq(checklists.id, checklistId))
          .returning();
        
        if (!updatedChecklist) {
          return undefined;
        }
        
        const tasksData = updatedChecklist.tasksData as TaskDTO[] || [];
        
        return {
          id: updatedChecklist.id.toString(),
          name: updatedChecklist.name,
          status: updatedChecklist.status as 'not-started' | 'in-progress' | 'completed',
          progress: updatedChecklist.progress,
          tasks: tasksData,
          remarks: updatedChecklist.remarks || "",
          createdAt: updatedChecklist.createdAt,
          updatedAt: updatedChecklist.updatedAt,
          userId: updatedChecklist.userId || undefined
        };
      } catch (error) {
        console.error("Error updating checklist:", error);
        return undefined;
      }
    }
    
    // If we can't convert to a numeric ID, return undefined
    return undefined;
  }

  async deleteChecklist(id: string): Promise<boolean> {
    try {
      if (!isNaN(parseInt(id)) && id.match(/^\d+$/)) {
        await db.delete(checklists).where(eq(checklists.id, parseInt(id)));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting checklist:", error);
      return false;
    }
  }

  async updateTask(checklistId: string, taskId: string, updates: Partial<TaskDTO>): Promise<TaskDTO | undefined> {
    // Get the checklist
    const checklist = await this.getChecklistById(checklistId);
    if (!checklist) {
      return undefined;
    }
    
    // Find and update the task
    const taskIndex = checklist.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      return undefined;
    }
    
    // Update the task
    const updatedTask = { ...checklist.tasks[taskIndex], ...updates };
    checklist.tasks[taskIndex] = updatedTask;
    
    // Recalculate progress
    const completedTasks = checklist.tasks.filter(task => task.completed).length;
    checklist.progress = Math.round((completedTasks / checklist.tasks.length) * 100);
    
    // Update status based on progress
    if (checklist.progress === 100) {
      checklist.status = 'completed';
    } else if (checklist.progress > 0) {
      checklist.status = 'in-progress';
    } else {
      checklist.status = 'not-started';
    }
    
    // Update timestamp
    checklist.updatedAt = new Date();
    
    // Save changes
    await this.updateChecklist(checklist);
    
    return updatedTask;
  }

  // Verification Methods
  async createVerification(verification: VerificationDTO): Promise<VerificationDTO> {
    try {
      const [insertedVerification] = await db
        .insert(verifications)
        .values({
          token: verification.token,
          code: verification.code,
          expiresAt: verification.expiresAt,
          verified: verification.verified,
          recipientId: verification.recipientId,
          recipientEmail: verification.recipientEmail,
          recipientPhone: verification.recipientPhone,
          checklistId: verification.checklistId,
          targetLanguage: verification.targetLanguage || 'en',
        })
        .returning();
      
      return {
        token: insertedVerification.token,
        code: insertedVerification.code,
        createdAt: insertedVerification.createdAt,
        expiresAt: insertedVerification.expiresAt,
        verified: insertedVerification.verified,
        recipientId: insertedVerification.recipientId,
        recipientEmail: insertedVerification.recipientEmail || undefined,
        recipientPhone: insertedVerification.recipientPhone || undefined,
        checklistId: insertedVerification.checklistId || undefined,
        targetLanguage: insertedVerification.targetLanguage || 'en',
      };
    } catch (error) {
      console.error('Error creating verification:', error);
      throw error;
    }
  }
  
  async getVerificationByToken(token: string): Promise<VerificationDTO | undefined> {
    try {
      const [foundVerification] = await db
        .select()
        .from(verifications)
        .where(eq(verifications.token, token));
      
      if (!foundVerification) return undefined;
      
      return {
        token: foundVerification.token,
        code: foundVerification.code,
        createdAt: foundVerification.createdAt,
        expiresAt: foundVerification.expiresAt,
        verified: foundVerification.verified,
        recipientId: foundVerification.recipientId,
        recipientEmail: foundVerification.recipientEmail || undefined,
        recipientPhone: foundVerification.recipientPhone || undefined,
        checklistId: foundVerification.checklistId || undefined,
        targetLanguage: foundVerification.targetLanguage || 'en',
      };
    } catch (error) {
      console.error('Error retrieving verification:', error);
      return undefined;
    }
  }
  
  async markVerificationAsVerified(token: string): Promise<boolean> {
    try {
      const [updated] = await db
        .update(verifications)
        .set({ verified: true })
        .where(eq(verifications.token, token))
        .returning();
      
      return !!updated;
    } catch (error) {
      console.error('Error marking verification as verified:', error);
      return false;
    }
  }
  
  /**
   * Update the verification code for a specific token
   * This is used to correct code mismatches during development/testing
   */
  async updateVerificationCode(token: string, code: string): Promise<boolean> {
    try {
      console.log(`Updating verification code for token: ${token}`);
      
      const [updated] = await db
        .update(verifications)
        .set({ code })
        .where(eq(verifications.token, token))
        .returning();
      
      return !!updated;
    } catch (error) {
      console.error('Error updating verification code:', error);
      return false;
    }
  }
  
  /**
   * Get all verifications from the database
   * Useful for debug and finding active verifications
   */
  async getAllVerifications(): Promise<VerificationDTO[]> {
    try {
      console.log(`Retrieving all verifications from database...`);
      
      // Get all verifications - no specific ordering needed
      const allVerifications = await db
        .select()
        .from(verifications);
        
      console.log(`Found ${allVerifications.length} verifications`);
      
      // Map database records to DTOs
      return allVerifications.map(v => ({
        token: v.token,
        code: v.code,
        createdAt: v.createdAt,
        expiresAt: v.expiresAt,
        verified: v.verified,
        recipientId: v.recipientId,
        recipientEmail: v.recipientEmail || undefined,
        recipientPhone: v.recipientPhone || undefined,
        checklistId: v.checklistId || undefined
      }));
    } catch (error) {
      console.error("Error retrieving all verifications:", error);
      return [];
    }
  }

  // Mailing list methods implementation
  async subscribeToMailingList(subscription: MailingListSubscriptionDTO): Promise<MailingListSubscriptionDTO> {
    try {
      const [insertedSubscription] = await db.insert(mailingListSubscriptions).values({
        email: subscription.email,
        confirmed: subscription.confirmed,
        confirmationToken: subscription.confirmationToken,
        source: subscription.source,
        leadType: subscription.leadType,
        userAgent: subscription.userAgent,
        ipAddress: subscription.ipAddress
      }).returning();

      return {
        id: insertedSubscription.id,
        email: insertedSubscription.email,
        subscribedAt: insertedSubscription.subscribedAt,
        confirmed: insertedSubscription.confirmed,
        confirmationToken: insertedSubscription.confirmationToken || undefined,
        source: insertedSubscription.source,
        leadType: insertedSubscription.leadType,
        userAgent: insertedSubscription.userAgent || undefined,
        ipAddress: insertedSubscription.ipAddress || undefined
      };
    } catch (error) {
      console.error('Error creating mailing list subscription:', error);
      throw error;
    }
  }

  async confirmMailingListSubscription(token: string): Promise<boolean> {
    try {
      const [updatedSubscription] = await db
        .update(mailingListSubscriptions)
        .set({ confirmed: true, confirmationToken: null })
        .where(eq(mailingListSubscriptions.confirmationToken, token))
        .returning();

      return !!updatedSubscription;
    } catch (error) {
      console.error('Error confirming mailing list subscription:', error);
      return false;
    }
  }

  async getMailingListSubscription(email: string): Promise<MailingListSubscriptionDTO | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(mailingListSubscriptions)
        .where(eq(mailingListSubscriptions.email, email));

      if (!subscription) return undefined;

      return {
        id: subscription.id,
        email: subscription.email,
        subscribedAt: subscription.subscribedAt,
        confirmed: subscription.confirmed,
        confirmationToken: subscription.confirmationToken || undefined,
        source: subscription.source,
        leadType: subscription.leadType,
        userAgent: subscription.userAgent || undefined,
        ipAddress: subscription.ipAddress || undefined
      };
    } catch (error) {
      console.error('Error retrieving mailing list subscription:', error);
      return undefined;
    }
  }

  // User management methods for subscription tiers
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }

  async updateUserSubscription(userId: string, tier: SubscriptionTier, stripeData?: {
    customerId?: string;
    subscriptionId?: string;
    status?: string;
    endsAt?: Date;
  }): Promise<User | undefined> {
    try {
      const updateData: any = {
        subscriptionTier: tier,
        updatedAt: new Date(),
      };

      if (stripeData) {
        if (stripeData.customerId) updateData.stripeCustomerId = stripeData.customerId;
        if (stripeData.subscriptionId) updateData.stripeSubscriptionId = stripeData.subscriptionId;
        if (stripeData.status) updateData.subscriptionStatus = stripeData.status;
        if (stripeData.endsAt) updateData.subscriptionEndsAt = stripeData.endsAt;
      }

      // Set allowed languages based on tier
      if (tier === 'free') {
        updateData.allowedLanguages = ['en', 'es'];
      } else if (tier === 'professional') {
        updateData.allowedLanguages = ['en', 'es', 'fr', 'de', 'it'];
      } else if (tier === 'enterprise') {
        updateData.allowedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar'];
      }

      const [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
      
      return user || undefined;
    } catch (error) {
      console.error('Error updating user subscription:', error);
      return undefined;
    }
  }

  async incrementUserUsage(userId: string, type: 'sync' | 'language'): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;

      if (type === 'sync') {
        await db
          .update(users)
          .set({ 
            listSyncCount: (user.listSyncCount || 0) + 1,
            lastSyncAt: new Date()
          })
          .where(eq(users.id, userId));
      } else if (type === 'language') {
        await db
          .update(users)
          .set({ 
            languageUseCount: (user.languageUseCount || 0) + 1
          })
          .where(eq(users.id, userId));
      }
      return true;
    } catch (error) {
      console.error('Error incrementing user usage:', error);
      return false;
    }
  }

  async checkUserLimits(userId: string, action: 'create_list' | 'translate' | 'sync'): Promise<{
    allowed: boolean;
    limit?: number;
    current?: number;
    tier: SubscriptionTier;
  }> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        return { allowed: false, tier: 'free' };
      }

      const tier = user.subscriptionTier as SubscriptionTier;
      const limits = TIER_LIMITS[tier];

      switch (action) {
        case 'create_list':
          const currentLists = await this.getAllChecklists(userId);
          const listCount = currentLists.length;
          return {
            allowed: listCount < limits.maxLists,
            limit: limits.maxLists === Infinity ? undefined : limits.maxLists,
            current: listCount,
            tier
          };

        case 'translate':
          const allowedLanguages = user.allowedLanguages as string[] || ['en', 'es'];
          return {
            allowed: true,
            limit: limits.maxLanguages === Infinity ? undefined : limits.maxLanguages,
            current: allowedLanguages.length,
            tier
          };

        case 'sync':
          return {
            allowed: true,
            tier
          };

        default:
          return { allowed: false, tier };
      }
    } catch (error) {
      console.error('Error checking user limits:', error);
      return { allowed: false, tier: 'free' };
    }
  }

  async recordSmsConsent(consent: SmsConsentDTO): Promise<SmsConsentDTO> {
    try {
      const [insertedConsent] = await db
        .insert(smsConsents)
        .values({
          phoneNumber: consent.phoneNumber,
          firstName: consent.firstName,
          lastName: consent.lastName,
          consentedAt: consent.consentedAt,
          ipAddress: consent.ipAddress,
          userAgent: consent.userAgent,
          isActive: consent.isActive ?? true
        })
        .returning();

      return {
        id: insertedConsent.id,
        phoneNumber: insertedConsent.phoneNumber,
        firstName: insertedConsent.firstName,
        lastName: insertedConsent.lastName,
        consentedAt: insertedConsent.consentedAt,
        ipAddress: insertedConsent.ipAddress || undefined,
        userAgent: insertedConsent.userAgent || undefined,
        isActive: insertedConsent.isActive || true
      };
    } catch (error) {
      console.error('Error recording SMS consent:', error);
      throw error;
    }
  }

  async getSmsConsent(phoneNumber: string): Promise<SmsConsentDTO | undefined> {
    try {
      const [consent] = await db
        .select()
        .from(smsConsents)
        .where(and(
          eq(smsConsents.phoneNumber, phoneNumber),
          eq(smsConsents.isActive, true)
        ))
        .orderBy(desc(smsConsents.createdAt))
        .limit(1);

      if (!consent) return undefined;

      return {
        id: consent.id,
        phoneNumber: consent.phoneNumber,
        firstName: consent.firstName,
        lastName: consent.lastName,
        consentedAt: consent.consentedAt,
        ipAddress: consent.ipAddress || undefined,
        userAgent: consent.userAgent || undefined,
        isActive: consent.isActive || true
      };
    } catch (error) {
      console.error('Error retrieving SMS consent:', error);
      return undefined;
    }
  }

  async revokeSmsConsent(phoneNumber: string): Promise<boolean> {
    try {
      const [updatedConsent] = await db
        .update(smsConsents)
        .set({ isActive: false })
        .where(eq(smsConsents.phoneNumber, phoneNumber))
        .returning();

      return !!updatedConsent;
    } catch (error) {
      console.error('Error revoking SMS consent:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();