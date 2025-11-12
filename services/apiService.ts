// Fix: Import `MembershipPlan` and KYC types to correctly type KYC-related functions.
// Fix: Import LiveHelpSession and LiveHelpMessage to support live help chat functionality.
import { Influencer, Message, User, PlatformSettings, Attachment, CollaborationRequest, CollabRequestStatus, Conversation, ConversationParticipant, Campaign, CampaignApplication, LiveTvChannel, AdSlotRequest, BannerAd, BannerAdBookingRequest, SupportTicket, TicketReply, SupportTicketStatus, Membership, UserRole, PayoutRequest, CampaignApplicationStatus, AdBookingStatus, AnyCollaboration, DailyPayoutRequest, Post, Comment, Dispute, MembershipPlan, Transaction, KycDetails, KycStatus, PlatformBanner, PushNotification, Boost, BoostDuration, LiveHelpSession, LiveHelpMessage, RefundRequest, View } from '../types';
import { db, storage } from './firebase';
// Fix: Corrected Firebase import statements to align with Firebase v9 modular syntax.
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  documentId,
  arrayUnion,
  increment,
  deleteDoc,
  arrayRemove,
  getCountFromServer,
  onSnapshot,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

const DEFAULT_AVATAR_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDRjMCAwIDAtMSAwLTJoMTJ2Mmg0di00YzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==';

const generateCollabId = (): string => `CRI${String(Math.floor(Math.random() * 10000000000)).padStart(10, '0')}`;

const initialInfluencersData: Omit<Influencer, 'id'>[] = [
  // FIX: Added missing engagementRate property to match the Influencer type.
  { name: 'Alex Doe', handle: 'alexdoe', avatar: DEFAULT_AVATAR_URL, bio: 'Lifestyle & Travel enthusiast sharing my journey.', followers: 125000, niche: 'Travel', engagementRate: 4.5, socialMediaLinks: 'https://instagram.com/alexdoe, https://youtube.com/alexdoe', location: 'Mumbai' },
  { name: 'Jane Smith', handle: 'janesmith.fit', avatar: DEFAULT_AVATAR_URL, bio: 'Fitness coach and nutritionist. Helping you be your best self!', followers: 250000, niche: 'Fitness', engagementRate: 5.2, socialMediaLinks: 'https://instagram.com/janesmith.fit, https://tiktok.com/@janesmith', location: 'Delhi' },
  { name: 'Tech Tom', handle: 'techtom', avatar: DEFAULT_AVATAR_URL, bio: 'Unboxing the latest gadgets and reviewing tech.', followers: 500000, niche: 'Technology', engagementRate: 6.1, socialMediaLinks: 'https://youtube.com/techtom, https://x.com/techtom', location: 'Bangalore' },
  { name: 'Foodie Fiona', handle: 'fionas.food', avatar: DEFAULT_AVATAR_URL, bio: 'Exploring the best culinary delights from around the world.', followers: 85000, niche: 'Food', engagementRate: 3.8, socialMediaLinks: 'https://instagram.com/fionas.food', location: 'Mumbai' },
  { name: 'Gamer Greg', handle: 'greggames', avatar: DEFAULT_AVATAR_URL, bio: 'Streaming the latest and greatest in the gaming world.', followers: 750000, niche: 'Gaming', engagementRate: 7.0, location: 'Pune' },
  { name: 'Fashionista Faye', handle: 'fayefashion', avatar: DEFAULT_AVATAR_URL, bio: 'Your daily dose of style inspiration and fashion tips.', followers: 320000, niche: 'Fashion', engagementRate: 4.9, socialMediaLinks: 'https://tiktok.com/@fayefashion, https://instagram.com/fayefashion', location: 'Delhi' },
];

const initialLiveTvChannels: Omit<LiveTvChannel, 'id' | 'ownerId'>[] = [
  { name: 'India Live News', logo: 'https://placehold.co/100x100/e91e63/ffffff?text=ILN', description: '24/7 news coverage from across the nation.', audienceSize: 15000000, niche: 'News' },
  { name: 'CineMax Movies', logo: 'https://placehold.co/100x100/3f51b5/ffffff?text=CM', description: 'Your destination for Bollywood blockbusters and classic films.', audienceSize: 22000000, niche: 'Entertainment' },
  { name: 'Sangeet Beats', logo: 'https://placehold.co/100x100/4caf50/ffffff?text=SB', description: 'The best of Indian music, from pop to classical.', audienceSize: 18000000, niche: 'Music' },
];

const initialBannerAdsData: Omit<BannerAd, 'id' | 'agencyId' | 'agencyName' | 'agencyAvatar' | 'timestamp'>[] = [
    { location: 'Mumbai', address: 'Bandra-Worli Sea Link, Bandra West', photoUrl: 'https://placehold.co/600x400/3f51b5/ffffff?text=Ad+Space+Mumbai', size: '40x20 ft', feePerDay: 5000, bannerType: 'Hoarding' },
    { location: 'Delhi', address: 'Connaught Place, Inner Circle', photoUrl: 'https://placehold.co/600x400/4caf50/ffffff?text=Ad+Space+Delhi', size: '60x30 ft', feePerDay: 7500, bannerType: 'Hoarding' },
    { location: 'Bangalore', address: 'MG Road, near Trinity Circle', photoUrl: 'https://placehold.co/600x400/e91e63/ffffff?text=Digital+Ad+BLR', size: '20x15 ft', feePerDay: 10000, bannerType: 'Digital Billboard' },
];

const isMembershipActive = (membership: Membership): boolean => {
    if (!membership || !membership.isActive || !membership.expiresAt) {
        return false;
    }
    const expiryDate = (membership.expiresAt as Timestamp).toDate();
    return expiryDate > new Date();
};

const getUsersWithActiveMembership = async (role: UserRole): Promise<string[]> => {
    const usersRef = collection(db, 'users');
    const q = query(
        usersRef,
        where('role', '==', role),
        where('membership.isActive', '==', true)
    );
    const snapshot = await getDocs(q);

    const activeUserIds: string[] = [];
    snapshot.forEach(doc => {
        const user = doc.data() as User;
        if (user.membership?.expiresAt && (user.membership.expiresAt as Timestamp).toDate() > new Date()) {
            activeUserIds.push(doc.id);
        }
    });

    return activeUserIds;
};


const formatMessageTimestamp = (timestamp: Timestamp | null): string => {
    if (!timestamp) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Centralized helper for mapping collaboration types to Firestore collection names.
const getCollectionNameForCollab = (collabType: 'direct' | 'campaign' | 'ad_slot' | 'banner_booking'): string => {
    const collectionMap = {
      direct: 'collaboration_requests',
      campaign: 'campaign_applications',
      ad_slot: 'ad_slot_requests',
      banner_booking: 'banner_booking_requests',
    };
    const collectionName = collectionMap[collabType];
    if (!collectionName) {
        // This should theoretically never be hit due to the strong typing, but it's a good safeguard.
        throw new Error(`Invalid collaboration type provided: "${collabType}"`);
    }
    return collectionName;
};

export const apiService = {
  sendNotificationToUser: async (userId: string, title: string, body: string, targetUrl?: string): Promise<void> => {
    // This simulates triggering a backend function to send a notification to a specific user.
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        const user = userDoc.data() as User;
        // Only queue notification if user has a token and has enabled notifications (or not explicitly disabled)
        if (user.fcmToken && user.notificationPreferences?.enabled !== false) {
            await addDoc(collection(db, 'user_notifications'), {
                userId,
                fcmToken: user.fcmToken, // For the backend function to use
                title,
                body,
                targetUrl: targetUrl || null,
                sentAt: serverTimestamp(),
                status: 'queued',
            });
        }
    }
  },
  uploadProfilePicture: (userId: string, file: File): Promise<string> => {
    const storageRef = ref(storage, `profile_pictures/${userId}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        () => {},
        (error) => reject(error),
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
        }
      );
    });
  },
  
  uploadBannerAdPhoto: (agencyId: string, file: File): Promise<string> => {
    const storageRef = ref(storage, `banner_ads/${agencyId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        () => {},
        (error) => reject(error),
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
        }
      );
    });
  },
  
  uploadMessageAttachment: (messageId: string, file: File): Promise<string> => {
    const storageRef = ref(storage, `message_attachments/${messageId}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        () => {},
        (error) => reject(error),
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
        }
      );
    });
  },
  
  uploadTicketAttachment: (ticketId: string, file: File): Promise<string> => {
    const storageRef = ref(storage, `support_tickets/${ticketId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        () => {},
        (error) => reject(error),
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
        }
      );
    });
  },

  uploadDailyPayoutVideo: async (userId: string, file: Blob): Promise<string> => {
    const storageRef = ref(storage, `daily_payout_videos/${userId}/${Date.now()}.webm`);
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType: 'video/webm' });
    
    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snapshot) => {}, // progress observer
            (error) => reject(error),
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
            }
        );
    });
  },
  
// Fix: Add KYC file upload helper function
  uploadKycFile: (userId: string, file: File, type: 'id_proof' | 'selfie'): Promise<string> => {
    const storageRef = ref(storage, `kyc_documents/${userId}/${type}_${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        () => {}, // progress observer
        (error) => reject(error),
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
        }
      );
    });
  },

  uploadPayoutSelfie: (userId: string, file: File): Promise<string> => {
    const storageRef = ref(storage, `payout_selfies/${userId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', () => {}, 
        (error) => reject(error), 
        () => { getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject); }
      );
    });
  },

  initializeFirestoreData: async (): Promise<void> => {
    // Seed Influencers
    const influencersRef = collection(db, 'influencers');
    const influencerSnapshot = await getDocs(query(influencersRef));
    if (influencerSnapshot.empty) {
      console.log("No influencers found, seeding database...");
      const batch = writeBatch(db);
      initialInfluencersData.forEach(influencer => {
        const docRef = doc(influencersRef); // Firestore generates ID
        batch.set(docRef, {...influencer, isBoosted: false, membershipActive: true });
      });
      await batch.commit();
      console.log("Influencers seeded successfully.");
    }
    
    // Seed Live TV Channels
    const liveTvRef = collection(db, 'livetv_channels');
    const tvSnapshot = await getDocs(query(liveTvRef));
    if (tvSnapshot.empty) {
        console.log("No Live TV channels found, seeding database...");
        const liveTvUsers = await getDocs(query(collection(db, 'users'), where('role', '==', 'livetv')));
        const defaultOwnerId = liveTvUsers.docs.length > 0 ? liveTvUsers.docs[0].id : "default_owner_id";

        const batch = writeBatch(db);
        initialLiveTvChannels.forEach(channel => {
            const docRef = doc(liveTvRef);
            batch.set(docRef, { ...channel, ownerId: defaultOwnerId });
        });
        await batch.commit();
        console.log("Live TV channels seeded successfully.");
    }

    // Seed Banner Ads
    const bannerAdsRef = collection(db, 'banner_ads');
    const bannerSnapshot = await getDocs(query(bannerAdsRef));
    if (bannerSnapshot.empty) {
        console.log("No banner ads found, seeding database...");
        const agencies = await getDocs(query(collection(db, 'users'), where('role', '==', 'banneragency')));
        const defaultAgency = agencies.docs.length > 0 ? { id: agencies.docs[0].id, ...agencies.docs[0].data() as User } : null;

        if (defaultAgency) {
            const batch = writeBatch(db);
            initialBannerAdsData.forEach(ad => {
                const docRef = doc(bannerAdsRef);
                batch.set(docRef, { 
                    ...ad, 
                    agencyId: defaultAgency.id,
                    agencyName: defaultAgency.companyName || defaultAgency.name,
                    agencyAvatar: defaultAgency.avatar,
                    timestamp: serverTimestamp() 
                });
            });
            await batch.commit();
            console.log("Banner ads seeded successfully.");
        } else {
            console.log("Could not seed banner ads: No banner agency user found.");
        }
    }
  },

  getInfluencersPaginated: async (
    settings: PlatformSettings,
    options: { limit: number; startAfterDoc?: QueryDocumentSnapshot<DocumentData> }
  ): Promise<{ influencers: Influencer[]; lastVisible: QueryDocumentSnapshot<DocumentData> | null }> => {
      if (!settings.areInfluencerProfilesPublic) return { influencers: [], lastVisible: null };
  
      const influencersCol = collection(db, 'influencers');
      
      // FIX: The original query required a composite index that is missing in the project.
      // To prevent the app from crashing, the orderBy('isBoosted', 'desc') clause has been removed.
      // FIX 2: The orderBy('followers', 'desc') also requires an index. It is removed to prevent crashes.
      // Influencers will appear in a default order. To restore sorting, create the required indexes in Firebase.
      let q = query(
          influencersCol, 
          where('membershipActive', '==', true),
          // orderBy('isBoosted', 'desc'), // This line requires a composite index.
          // orderBy('followers', 'desc'), // This line also requires a composite index.
          limit(options.limit)
      );
  
      if (options.startAfterDoc) {
          q = query(
              influencersCol,
              where('membershipActive', '==', true),
              // orderBy('isBoosted', 'desc'), // This line requires a composite index.
              // orderBy('followers', 'desc'), // This line also requires a composite index.
              startAfter(options.startAfterDoc),
              limit(options.limit)
          );
      }
      
      const snapshot = await getDocs(q);
      const influencers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Influencer));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
  
      return { influencers, lastVisible };
  },
  
  // FIX: Implement missing function and correct logic to query channels by ownerId.
  getLiveTvChannels: async (settings: PlatformSettings): Promise<LiveTvChannel[]> => {
    const channelsCol = collection(db, 'livetv_channels');
    
    const activeTvUserIds = await getUsersWithActiveMembership('livetv');
    if (activeTvUserIds.length === 0) {
        return [];
    }

    const userChunks: string[][] = [];
    for (let i = 0; i < activeTvUserIds.length; i += 30) {
        userChunks.push(activeTvUserIds.slice(i, i + 30));
    }

    const promises = userChunks.map(chunk => {
        const chunkQuery = query(channelsCol, where('ownerId', 'in', chunk));
        return getDocs(chunkQuery);
    });
    
    const snapshots = await Promise.all(promises);
    return snapshots.flatMap(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveTvChannel)));
  },

  // START of new implementations
  // Settings
  getPlatformSettings: async (): Promise<PlatformSettings> => {
    const docRef = doc(db, 'settings', 'platform');
    
    // FIX: Define a complete default settings object to prevent TypeErrors on missing fields (like boostPrices).
    const defaultSettings: PlatformSettings = {
        welcomeMessage: 'Welcome to Collabzz, the premier platform for brands and influencers.',
        isMessagingEnabled: true,
        areInfluencerProfilesPublic: true,
        youtubeTutorialUrl: 'https://www.youtube.com',
        isNotificationBannerEnabled: false,
        notificationBannerText: '',
        payoutSettings: {
            requireLiveVideoForDailyPayout: true,
            requireSelfieForPayout: true,
        },
        isMaintenanceModeEnabled: false,
        isCommunityFeedEnabled: true,
        isWelcomeMessageEnabled: true,
        paymentGatewayApiId: '',
        paymentGatewayApiSecret: '',
        paymentGatewaySourceCode: '',
        otpApiId: '',
        otpApiSecret: '',
        otpApiSourceCode: '',
        isOtpLoginEnabled: true,
        isForgotPasswordOtpEnabled: true,
        isStaffRegistrationEnabled: true, // Enabled by default to ensure admin access
        isSocialMediaFabEnabled: true,
        socialMediaLinks: [],
        isDigilockerKycEnabled: true,
        digilockerClientId: '',
        digilockerClientSecret: '',
        isKycIdProofRequired: true,
        isKycSelfieRequired: true,
        isProMembershipEnabled: true,
        isCreatorMembershipEnabled: true,
        membershipPrices: {
          free: 0,
          pro_10: 1000,
          pro_20: 1800,
          pro_unlimited: 2500,
          normal_1m: 100,
          normal_6m: 500,
          normal_1y: 900,
        },
        gstRate: 18,
        isGstEnabled: true,
        platformCommissionRate: 10,
        isPlatformCommissionEnabled: true,
        paymentProcessingChargeRate: 2,
        isPaymentProcessingChargeEnabled: true,
        isProfileBoostingEnabled: true,
        isCampaignBoostingEnabled: true,
        boostPrices: {
          '1w': 500,
          '2w': 900,
          '1m': 1500,
          '1y': 15000,
        },
        liveHelpStaffId: '',
        discountSettings: {
            creatorProfileBoost: { isEnabled: false, percentage: 0 },
            brandMembership: { isEnabled: false, percentage: 0 },
            creatorMembership: { isEnabled: false, percentage: 0 },
            brandCampaignBoost: { isEnabled: false, percentage: 0 },
        },
    };
    
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const existingData = docSnap.data();
            // Merge defaults with existing data to ensure all fields are present
            return { 
                ...defaultSettings, 
                ...existingData, 
                payoutSettings: { ...defaultSettings.payoutSettings, ...existingData.payoutSettings },
                discountSettings: { ...defaultSettings.discountSettings, ...(existingData.discountSettings || {}) }
            } as PlatformSettings;
        } else {
            // If the document doesn't exist, try to create it with the full default settings
            await setDoc(docRef, defaultSettings);
            return defaultSettings;
        }
    } catch (error) {
        console.warn("Could not read/write platform settings from Firestore due to permission error. Falling back to local default settings.", error);
        // On permission error, just return the local defaults so the app can still run.
        return defaultSettings;
    }
  },

  updatePlatformSettings: async (settings: PlatformSettings): Promise<void> => {
    const docRef = doc(db, 'settings', 'platform');
    await setDoc(docRef, settings, { merge: true });
  },

  // Users
  getAllUsers: async (): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },

  getUsersPaginated: async (options: { pageLimit: number; startAfterDoc?: QueryDocumentSnapshot<DocumentData> }): Promise<{ users: User[]; lastVisible: QueryDocumentSnapshot<DocumentData> | null }> => {
    const usersCol = collection(db, 'users');
    let q = query(usersCol, orderBy('name'), limit(options.pageLimit));
    if (options.startAfterDoc) {
        q = query(usersCol, orderBy('name'), startAfter(options.startAfterDoc), limit(options.pageLimit));
    }
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
    return { users, lastVisible };
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  },

  getUserByMobile: async (mobile: string): Promise<User | null> => {
    const q = query(collection(db, 'users'), where('mobileNumber', '==', mobile));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  },

  updateUserProfile: async (userId: string, data: Partial<User>): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);
  },

  updateUser: async (userId: string, data: Partial<User>): Promise<void> => {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, data);
  },

  // Influencer Profile
  getInfluencerProfile: async (influencerId: string): Promise<Influencer | null> => {
    const docRef = doc(db, 'influencers', influencerId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Influencer;
    }
    return null;
  },

  updateInfluencerProfile: async (influencerId: string, data: Partial<Influencer>): Promise<void> => {
    const docRef = doc(db, 'influencers', influencerId);
    await setDoc(docRef, data, { merge: true });
  },

  // Messaging
  getMessages: async (userId1: string, userId2: string): Promise<Message[]> => {
    const participantIds = [userId1, userId2].sort();
    const q = query(collection(db, 'messages'), where('participantIds', '==', participantIds));
    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })); // Keep raw timestamp
    messages.sort((a,b) => ((a.timestamp as Timestamp)?.toMillis() || 0) - ((b.timestamp as Timestamp)?.toMillis() || 0));
    return messages.map(msg => ({ ...msg, timestamp: formatMessageTimestamp(msg.timestamp) }));
  },

  getMessagesListener: (
    userId1: string,
    userId2: string,
    callback: (messages: Message[]) => void,
    onError: (error: Error) => void
  ): (() => void) => { // Returns an unsubscribe function
    const participantIds = [userId1, userId2].sort();
    const q = query(
      collection(db, 'messages'),
      where('participantIds', '==', participantIds),
      orderBy('timestamp', 'asc')
    );
  
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: formatMessageTimestamp(doc.data().timestamp as Timestamp),
      })) as Message[];
      callback(messages);
    }, onError);
  },

  sendMessage: async (text: string, senderId: string, receiverId: string, attachments: Attachment[]): Promise<Message> => {
    const participantIds = [senderId, receiverId].sort();
    const docRef = await addDoc(collection(db, 'messages'), {
      text,
      senderId,
      receiverId,
      attachments: attachments || [],
      timestamp: serverTimestamp(),
      participantIds,
    });

    return {
      id: docRef.id,
      text,
      senderId,
      receiverId,
      attachments: attachments || [],
      timestamp: formatMessageTimestamp(null),
    };
  },
  
  getConversations: async (userId: string): Promise<Conversation[]> => {
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where('participantIds', 'array-contains', userId));
    const snapshot = await getDocs(q);
    
    const messagesByParticipant: { [key: string]: Message } = {};
    snapshot.docs.forEach(doc => {
        const msg = {id: doc.id, ...doc.data()} as Message;
        const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
        if (!messagesByParticipant[otherId] || (msg.timestamp as Timestamp) > (messagesByParticipant[otherId].timestamp as Timestamp)) {
            messagesByParticipant[otherId] = msg;
        }
    });

    const participantIds = Object.keys(messagesByParticipant);
    if (participantIds.length === 0) return [];
    
    const profilePromises = participantIds.map(async (id) => {
        const userDocRef = doc(db, 'users', id);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            return { id: userDoc.id, ...userDoc.data() } as User;
        }
        
        const influencerDocRef = doc(db, 'influencers', id);
        const influencerDoc = await getDoc(influencerDocRef);
        if (influencerDoc.exists()) {
            return { id: influencerDoc.id, ...influencerDoc.data(), role: 'influencer' } as Influencer & { role: 'influencer' };
        }
        return null;
    });

    const profiles = (await Promise.all(profilePromises)).filter(Boolean) as (User | Influencer)[];
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    
    const conversations = Object.entries(messagesByParticipant)
        .map(([otherId, lastMessage]) => {
            const participantProfile = profileMap.get(otherId);
            if (!participantProfile) return null;

            const participant: ConversationParticipant = {
                id: participantProfile.id,
                name: participantProfile.name,
                avatar: participantProfile.avatar || DEFAULT_AVATAR_URL,
                role: 'role' in participantProfile ? participantProfile.role : 'influencer',
                handle: 'handle' in participantProfile ? participantProfile.handle : undefined,
                companyName: 'companyName' in participantProfile ? participantProfile.companyName : undefined,
            };

            return {
                id: otherId,
                participant: participant,
                lastMessage: {
                    text: lastMessage.text,
                    timestamp: lastMessage.timestamp,
                },
            };
        })
        .filter((c): c is Conversation => c !== null);
    
    conversations.sort((a, b) => ((b.lastMessage.timestamp as Timestamp)?.toMillis() || 0) - ((a.lastMessage.timestamp as Timestamp)?.toMillis() || 0));

    return conversations;
  },

  // Collaboration Requests
  sendCollabRequest: async (requestData: Omit<CollaborationRequest, 'id' | 'status' | 'timestamp'>): Promise<void> => {
    const userDocRef = doc(db, 'users', requestData.brandId);
    const userDoc = await getDoc(userDocRef);
    const user = userDoc.data() as User;

    if (user.membership.plan === 'free' && user.membership.usage.directCollaborations >= 1) {
        throw new Error("You have reached your direct collaboration limit on the free plan. Please upgrade to Pro.");
    }
    
    await addDoc(collection(db, 'collaboration_requests'), {
      ...requestData,
      collabId: generateCollabId(),
      status: 'pending',
      timestamp: serverTimestamp(),
    });

    // Increment usage
    await updateDoc(userDocRef, {
        'membership.usage.directCollaborations': increment(1)
    });
  },

  getCollabRequestsForBrand: async (brandId: string): Promise<CollaborationRequest[]> => {
    const q = query(collection(db, 'collaboration_requests'), where('brandId', '==', brandId));
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CollaborationRequest));
    requests.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return requests;
  },

  getCollabRequestsForBrandListener: (
    brandId: string,
    callback: (requests: CollaborationRequest[]) => void,
    onError: (error: Error) => void
  ): (() => void) => {
    // FIX: Removed orderBy to prevent Firestore index error. Sorting is now handled client-side.
    const q = query(
      collection(db, 'collaboration_requests'),
      where('brandId', '==', brandId)
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CollaborationRequest));
      // Client-side sorting by timestamp descending.
      requests.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
      callback(requests);
    }, onError);
  },
  
  getCollabRequestsForInfluencer: async (influencerId: string): Promise<CollaborationRequest[]> => {
    const q = query(collection(db, 'collaboration_requests'), where('influencerId', '==', influencerId));
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CollaborationRequest));
    requests.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return requests;
  },

  getCollabRequestsForInfluencerListener: (
    influencerId: string,
    callback: (requests: CollaborationRequest[]) => void,
    onError: (error: Error) => void
  ): (() => void) => {
    // FIX: Removed orderBy to prevent Firestore index error. Sorting is now handled client-side.
    const q = query(
      collection(db, 'collaboration_requests'),
      where('influencerId', '==', influencerId)
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CollaborationRequest));
      // Client-side sorting by timestamp descending.
      requests.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
      callback(requests);
    }, onError);
  },

  updateCollaborationRequest: async (reqId: string, data: Partial<CollaborationRequest>, actorId: string): Promise<void> => {
    const docRef = doc(db, 'collaboration_requests', reqId);
    const updateData: any = {...data};

    // If a new offer is being made, move the old one to the history.
    if (data.currentOffer) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const oldRequest = docSnap.data() as CollaborationRequest;
            if (oldRequest.currentOffer) {
                const historyEntry = { ...oldRequest.currentOffer, timestamp: Timestamp.now() };
                updateData.offerHistory = arrayUnion(historyEntry);
            }
        }
    }

    await updateDoc(docRef, updateData);
    
    // --- New Notification Logic ---
    if (data.status) {
        const collabDoc = await getDoc(docRef);
        if (!collabDoc.exists()) return;
        const collab = collabDoc.data() as CollaborationRequest;
        
        const isActorBrand = actorId === collab.brandId;
        const recipientId = isActorBrand ? collab.influencerId : collab.brandId;
        const actorName = isActorBrand ? collab.brandName : collab.influencerName;

        let title = '';
        let body = '';
        let targetView: View = isActorBrand ? View.COLLAB_REQUESTS : View.MY_COLLABORATIONS;

        switch (data.status) {
            case 'brand_offer': title = `New Offer for "${collab.title}"`; body = `${actorName} has sent you a counter-offer.`; break;
            case 'influencer_offer': title = `New Offer for "${collab.title}"`; body = `${actorName} has sent you an offer.`; break;
            case 'agreement_reached': title = `Agreement Reached for "${collab.title}"!`; body = `Payment is now pending from the brand.`; break;
            case 'in_progress': if (data.paymentStatus === 'paid') { title = `Payment Confirmed for "${collab.title}"`; body = `${actorName} has completed the payment. You can now start the work.`; } break;
            case 'work_submitted': title = `Work Submitted for "${collab.title}"`; body = `${actorName} has submitted their work for your review.`; break;
            case 'completed': title = `Collaboration Completed!`; body = `${actorName} has marked "${collab.title}" as complete.`; break;
            case 'rejected': title = `Update on "${collab.title}"`; body = `Your collaboration request with ${actorName} has been rejected.`; break;
            case 'disputed': title = `Dispute Raised for "${collab.title}"`; body = `A dispute has been raised by ${actorName}. An admin will review it shortly.`; break;
        }

        if (title && body) {
            await apiService.sendNotificationToUser(recipientId, title, body);
        }
    }
  },
  
  // Marketing / Banners
  getPlatformBanners: async (): Promise<PlatformBanner[]> => {
    const bannersRef = collection(db, 'platform_banners');
    const q = query(bannersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlatformBanner));
  },
  
  getActivePlatformBanners: async (): Promise<PlatformBanner[]> => {
      const bannersRef = collection(db, 'platform_banners');
      const q = query(bannersRef, where('isActive', '==', true));
      try {
          const snapshot = await getDocs(q);
          const banners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlatformBanner));
          banners.sort((a, b) => ((b.createdAt as Timestamp)?.toMillis() || 0) - ((a.createdAt as Timestamp)?.toMillis() || 0));
          return banners;
      } catch (error) {
          console.warn("Could not fetch active platform banners from Firestore due to permission error. Returning an empty list.", error);
          return [];
      }
  },
  
  createPlatformBanner: async (data: Omit<PlatformBanner, 'id' | 'createdAt'>): Promise<void> => {
    await addDoc(collection(db, 'platform_banners'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  },

  updatePlatformBanner: async (id: string, data: Partial<PlatformBanner>): Promise<void> => {
    await updateDoc(doc(db, 'platform_banners', id), data);
  },

  deletePlatformBanner: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'platform_banners', id));
  },
  
  uploadPlatformBannerImage: (file: File): Promise<string> => {
    const storageRef = ref(storage, `platform_banners/${Date.now()}_${file.name}`);
    return new Promise((resolve, reject) => {
      uploadBytes(storageRef, file).then(snapshot => {
        getDownloadURL(snapshot.ref).then(resolve).catch(reject);
      }).catch(reject);
    });
  },

  // Push Notifications
  saveFcmToken: async (userId: string, token: string | null): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { fcmToken: token });
  },

  updateNotificationPreferences: async (userId: string, preferences: { enabled: boolean }): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { notificationPreferences: preferences });
  },

  getSubscribedUserCount: async (): Promise<number> => {
      const tokensRef = collection(db, 'fcm_tokens');
      const snapshot = await getCountFromServer(tokensRef);
      return snapshot.data().count;
  },

  sendPushNotification: async (title: string, body: string, targetUrl?: string): Promise<void> => {
    // In a real app, this would trigger a backend function.
    // For this simulation, we'll just log it to a Firestore collection.
    await addDoc(collection(db, 'sent_notifications'), {
        title,
        body,
        targetUrl: targetUrl || null,
        sentAt: serverTimestamp(),
        status: 'queued', // A backend function would pick this up
    });
  },

  sendBulkEmail: async (targetRole: UserRole, subject: string, body: string): Promise<void> => {
    // In a real app, this would trigger a backend function.
    // For this simulation, we'll just log it to a Firestore collection.
    await addDoc(collection(db, 'sent_emails'), {
        targetRole,
        subject,
        body,
        sentAt: serverTimestamp(),
        status: 'queued', // A backend function would pick this up
    });
  },
  
  // Boosts
  getBoostsForUser: async (userId: string): Promise<Boost[]> => {
    const q = query(collection(db, 'boosts'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Boost));
  },
  
  activateBoost: async (userId: string, plan: BoostDuration, targetId: string, targetType: 'profile' | 'campaign'): Promise<void> => {
    const durationMap: Record<BoostDuration, number> = { '1w': 7, '2w': 14, '1m': 30, '1y': 365 };
    const days = durationMap[plan];
    
    const now = new Date();
    const expiresAt = new Date(now.setDate(now.getDate() + days));

    await addDoc(collection(db, 'boosts'), {
        userId,
        plan,
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: serverTimestamp(),
        targetId,
        targetType,
    });
    
    // Also update the target document itself
    if (targetType === 'campaign') {
        const targetRef = doc(db, 'campaigns', targetId);
        await updateDoc(targetRef, { isBoosted: true });
        return;
    }

    if (targetType === 'profile') {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            throw new Error(`User ${userId} not found, cannot determine role for boost.`);
        }
        const userRole = userSnap.data().role as UserRole;

        let targetCollection: string | null = null;
        switch (userRole) {
            case 'influencer':
                targetCollection = 'influencers';
                break;
            case 'livetv':
                targetCollection = 'livetv_channels';
                break;
            default:
                // For roles like 'banneragency', there's no profile to boost.
                // Log a warning but don't throw an error, as payment has been made.
                console.warn(`Profile boost called for unhandled role: ${userRole}. Boost record created but no profile flagged.`);
                return;
        }

        const targetRef = doc(db, targetCollection, targetId);
        await updateDoc(targetRef, { isBoosted: true });
    }
  },

  // Support Tickets
  createSupportTicket: async (ticketData: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt'>, firstReply: Omit<TicketReply, 'id' | 'ticketId' | 'timestamp'>): Promise<void> => {
    const ticketRef = await addDoc(collection(db, 'support_tickets'), {
      ...ticketData,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Add the initial message as the first reply
    await addDoc(collection(db, `support_tickets/${ticketRef.id}/replies`), {
      ...firstReply,
      ticketId: ticketRef.id,
      timestamp: serverTimestamp(),
    });
  },
  
  getTicketsForUser: async (userId: string): Promise<SupportTicket[]> => {
    // FIX: Removed orderBy to prevent index error. Sorting will be done client-side.
    const q = query(collection(db, 'support_tickets'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
    // Sort client-side
    tickets.sort((a, b) => ((b.updatedAt as Timestamp)?.toMillis() || 0) - ((a.updatedAt as Timestamp)?.toMillis() || 0));
    return tickets;
  },
  
  getAllTickets: async (): Promise<SupportTicket[]> => {
    const q = query(collection(db, 'support_tickets'), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
  },

  getTicketReplies: async (ticketId: string): Promise<TicketReply[]> => {
    const q = query(collection(db, `support_tickets/${ticketId}/replies`), orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketReply));
  },
  
  addTicketReply: async (replyData: Omit<TicketReply, 'id' | 'timestamp'>): Promise<void> => {
      const ticketRef = doc(db, 'support_tickets', replyData.ticketId);
      const repliesRef = collection(db, `support_tickets/${replyData.ticketId}/replies`);

      const batch = writeBatch(db);
      
      // Add the new reply
      const newReplyRef = doc(repliesRef);
      batch.set(newReplyRef, {
          ...replyData,
          timestamp: serverTimestamp(),
      });
      
      // Update the ticket's updatedAt timestamp and status if it was closed.
      const updateData: { updatedAt: any, status?: SupportTicketStatus } = {
          updatedAt: serverTimestamp(),
      };
      // If a user replies, re-open the ticket. If staff replies, move it to in-progress.
      if (replyData.senderRole !== 'staff') {
          updateData.status = 'open';
      } else {
          updateData.status = 'in_progress';
      }
      batch.update(ticketRef, updateData);
      
      await batch.commit();
  },
  
  updateTicketStatus: async (ticketId: string, status: SupportTicketStatus): Promise<void> => {
      const ticketRef = doc(db, 'support_tickets', ticketId);
      await updateDoc(ticketRef, { status: status, updatedAt: serverTimestamp() });
  },

  // Disputes
  createDispute: async (disputeData: Omit<Dispute, 'id' | 'timestamp' | 'status'>): Promise<void> => {
    const collectionName = getCollectionNameForCollab(disputeData.collaborationType);
    const collabRef = doc(db, collectionName, disputeData.collaborationId);
    
    const collabDoc = await getDoc(collabRef);

    const batch = writeBatch(db);

    // Create the dispute document
    batch.set(doc(collection(db, 'disputes')), {
      ...disputeData,
      status: 'open',
      timestamp: serverTimestamp(),
    });
    
    // Update the collaboration status to 'disputed' if it exists
    if (collabDoc.exists()) {
        batch.update(collabRef, { status: 'disputed' });
    }

    await batch.commit();
  },
  
  getDisputes: async (): Promise<Dispute[]> => {
    // Fetch all disputes, not just open ones, to allow viewing of resolved disputes in admin panel.
    const q = query(collection(db, 'disputes'));
    const snapshot = await getDocs(q);
    const disputes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dispute));
    // Sort client-side by most recent first
    disputes.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return disputes;
  },
  
  resolveDisputeForCreator: async (disputeId: string, collabId: string, collabType: Dispute['collaborationType']): Promise<void> => {
      const collectionName = getCollectionNameForCollab(collabType);
      const disputeRef = doc(db, 'disputes', disputeId);
      const collabRef = doc(db, collectionName, collabId);
      
      const batch = writeBatch(db);
      batch.update(disputeRef, { status: 'resolved' });
      
      const collabDoc = await getDoc(collabRef);
      if (collabDoc.exists()) {
          batch.update(collabRef, { status: 'completed' });
      }
      
      await batch.commit();
  },
  
  resolveDisputeForBrand: async (disputeId: string, collabId: string, collabType: Dispute['collaborationType']): Promise<void> => {
      const collectionName = getCollectionNameForCollab(collabType);
      const disputeRef = doc(db, 'disputes', disputeId);
      const collabRef = doc(db, collectionName, collabId);
      
      const batch = writeBatch(db);
      batch.update(disputeRef, { status: 'resolved' });
      
      const collabDoc = await getDoc(collabRef);
      if (collabDoc.exists()) {
          batch.update(collabRef, { status: 'brand_decision_pending' });
      }
      
      await batch.commit();
  },

  brandCompletesDisputedWork: async (collabId: string, collabType: Dispute['collaborationType']): Promise<void> => {
    const collectionName = getCollectionNameForCollab(collabType);
    const collabRef = doc(db, collectionName, collabId);
    const collabDoc = await getDoc(collabRef);
    if (collabDoc.exists()) {
        await updateDoc(collabRef, { status: 'completed' });
    }
  },

  // START of added functions
  
  getAllTransactions: async (): Promise<Transaction[]> => {
    const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  },

  getAllPayouts: async (): Promise<PayoutRequest[]> => {
    const q = query(collection(db, 'payout_requests'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
  },

  getOrCreateLiveHelpSession: async (userId: string, userName: string, userAvatar: string, staffId: string): Promise<string> => {
    const sessionsRef = collection(db, 'live_help_sessions');
    const q = query(sessionsRef, where('userId', '==', userId), where('status', '==', 'open'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return snapshot.docs[0].id;
    }
    const newSessionRef = await addDoc(sessionsRef, {
        userId,
        userName,
        userAvatar,
        assignedStaffId: staffId,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userHasUnread: false,
        staffHasUnread: true,
    });
    return newSessionRef.id;
  },

  submitKyc: async (userId: string, details: KycDetails, idProofFile: File | null, selfieFile: File | null): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    
    // Using dot notation for updates is safer as it doesn't overwrite the whole object.
    const updateData: { [key: string]: any } = {
        kycStatus: 'pending',
    };

    // Add all form details to the update object
    Object.entries(details).forEach(([key, value]) => {
        if (value !== undefined && value !== null) { // Firestore cannot store `undefined`
            updateData[`kycDetails.${key}`] = value;
        }
    });

    if (idProofFile) {
        const idProofUrl = await apiService.uploadKycFile(userId, idProofFile, 'id_proof');
        updateData['kycDetails.idProofUrl'] = idProofUrl;
    }
    if (selfieFile) {
        const selfieUrl = await apiService.uploadKycFile(userId, selfieFile, 'selfie');
        updateData['kycDetails.selfieUrl'] = selfieUrl;
    }

    await updateDoc(userRef, updateData);
  },

  submitDigilockerKyc: async (userId: string): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { kycStatus: 'approved' });
  },

  getKycSubmissions: async (): Promise<User[]> => {
    const q = query(collection(db, 'users'), where('kycStatus', '==', 'pending'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },

  updateKycStatus: async (userId: string, status: KycStatus, reason?: string): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    const updateData: any = { kycStatus: status };
    if (status === 'rejected' && reason) {
        updateData['kycDetails.rejectionReason'] = reason;
    }
    await updateDoc(userRef, updateData);
  },

  getCampaignsForBrand: async (brandId: string): Promise<Campaign[]> => {
    const q = query(collection(db, 'campaigns'), where('brandId', '==', brandId));
    const snapshot = await getDocs(q);
    const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
    campaigns.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return campaigns;
  },
  
  getApplicationsForCampaign: async (campaignId: string): Promise<CampaignApplication[]> => {
    const q = query(collection(db, 'campaign_applications'), where('campaignId', '==', campaignId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampaignApplication));
  },
  
  getCampaignApplicationsForInfluencer: async (influencerId: string): Promise<CampaignApplication[]> => {
    const q = query(collection(db, 'campaign_applications'), where('influencerId', '==', influencerId));
    const snapshot = await getDocs(q);
    const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampaignApplication));
    apps.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return apps;
  },
  
  getAdSlotRequestsForLiveTv: async (ownerId: string): Promise<AdSlotRequest[]> => {
    // Find channel ID first, assuming it's the same as the ownerId
    const q = query(collection(db, 'ad_slot_requests'), where('liveTvId', '==', ownerId));
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdSlotRequest));
    requests.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return requests;
  },

  getBannerAdBookingRequestsForAgency: async (agencyId: string): Promise<BannerAdBookingRequest[]> => {
    const q = query(collection(db, 'banner_booking_requests'), where('agencyId', '==', agencyId));
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BannerAdBookingRequest));
    requests.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return requests;
  },

  getPosts: async (userId?: string): Promise<Post[]> => {
    const postsRef = collection(db, 'posts');
    
    // Fetch public posts without ordering to avoid index requirement on (visibility, isBlocked, timestamp)
    const publicQuery = query(postsRef, where('visibility', '==', 'public'));
    const publicSnap = await getDocs(publicQuery);
    
    let allPosts = publicSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Post))
        .filter(p => p.isBlocked !== true); // Filter blocked posts client-side
    
    if (userId) {
        // Fetch private posts for user
        const privateQuery = query(postsRef, where('visibility', '==', 'private'), where('userId', '==', userId));
        const privateSnap = await getDocs(privateQuery);
        const privatePosts = privateSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Post))
            .filter(p => p.isBlocked !== true);
            
        allPosts = [...allPosts, ...privatePosts];
    }

    // Sort by timestamp descending client-side
    return allPosts.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
  },

  deletePost: async (postId: string): Promise<void> => {
    await deleteDoc(doc(db, 'posts', postId));
  },
  
  updatePost: async (postId: string, data: Partial<Post>): Promise<void> => {
    await updateDoc(doc(db, 'posts', postId), data);
  },

  getAllCollaborationRequests: async (): Promise<CollaborationRequest[]> => {
    const snapshot = await getDocs(collection(db, 'collaboration_requests'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CollaborationRequest));
  },
  
  getAllCampaignApplications: async (): Promise<CampaignApplication[]> => {
    const snapshot = await getDocs(collection(db, 'campaign_applications'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampaignApplication));
  },
  
  getAllAdSlotRequests: async (): Promise<AdSlotRequest[]> => {
    const snapshot = await getDocs(collection(db, 'ad_slot_requests'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdSlotRequest));
  },
  
  getAllBannerAdBookingRequests: async (): Promise<BannerAdBookingRequest[]> => {
    const snapshot = await getDocs(collection(db, 'banner_booking_requests'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BannerAdBookingRequest));
  },

  getAllRefundRequests: async (): Promise<RefundRequest[]> => {
    const snapshot = await getDocs(collection(db, 'refund_requests'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RefundRequest));
  },
  
  getAllDailyPayoutRequests: async (): Promise<DailyPayoutRequest[]> => {
    const snapshot = await getDocs(collection(db, 'daily_payout_requests'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyPayoutRequest));
  },

  createCampaign: async (campaignData: Omit<Campaign, 'id' | 'status' | 'timestamp' | 'applicantIds'>): Promise<void> => {
    const userDocRef = doc(db, 'users', campaignData.brandId);
    const userDoc = await getDoc(userDocRef);
    const user = userDoc.data() as User;

    if (user.membership.plan === 'free' && user.membership.usage.campaigns >= 1) {
        throw new Error("You have reached your campaign limit on the free plan. Please upgrade to Pro.");
    }

    await addDoc(collection(db, 'campaigns'), {
        ...campaignData,
        status: 'open',
        timestamp: serverTimestamp(),
        applicantIds: [],
    });
    
    await updateDoc(userDocRef, { 'membership.usage.campaigns': increment(1) });
  },

  getAllOpenCampaigns: async (userLocation?: string): Promise<Campaign[]> => {
    const campaignsRef = collection(db, 'campaigns');
    let q = query(campaignsRef, where('status', '==', 'open'));

    const snapshot = await getDocs(q);
    let campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));

    // Prioritize boosted, then location-based, then others
    campaigns.sort((a, b) => {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        if (userLocation) {
            if (a.location === userLocation && b.location !== userLocation) return -1;
            if (a.location !== userLocation && b.location === userLocation) return 1;
        }
        return ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0);
    });
    
    return campaigns;
  },

  applyToCampaign: async (applicationData: Omit<CampaignApplication, 'id' | 'status' | 'timestamp'>): Promise<void> => {
    const campaignRef = doc(db, 'campaigns', applicationData.campaignId);
    
    const appRef = await addDoc(collection(db, 'campaign_applications'), {
      ...applicationData,
      collabId: generateCollabId(),
      status: 'pending_brand_review',
      timestamp: serverTimestamp(),
    });

    await updateDoc(campaignRef, {
      applicantIds: arrayUnion(applicationData.influencerId)
    });
  },

  updateCampaignApplication: async (appId: string, data: Partial<CampaignApplication>, actorId: string): Promise<void> => {
    const docRef = doc(db, 'campaign_applications', appId);
    await updateDoc(docRef, data);
    
    if (data.status) {
        const appDoc = await getDoc(docRef);
        if (!appDoc.exists()) return;
        const app = appDoc.data() as CampaignApplication;
        
        const isActorBrand = actorId === app.brandId;
        const recipientId = isActorBrand ? app.influencerId : app.brandId;
        const actorName = isActorBrand ? app.brandName : app.influencerName;

        let title = '';
        let body = '';

        switch (data.status) {
            case 'brand_counter_offer': title = `New Offer for "${app.campaignTitle}"`; body = `${actorName} sent a counter-offer.`; break;
            case 'influencer_counter_offer': title = `New Offer for "${app.campaignTitle}"`; body = `${actorName} sent an offer.`; break;
            case 'agreement_reached': title = `Agreement Reached for "${app.campaignTitle}"`; body = `Payment is now pending from the brand.`; break;
            case 'in_progress': if (data.paymentStatus === 'paid') { title = `Payment Confirmed!`; body = `${actorName} paid for "${app.campaignTitle}". You can start work.`; } break;
            case 'work_submitted': title = `Work Submitted for "${app.campaignTitle}"`; body = `${actorName} submitted their work for review.`; break;
            case 'completed': title = `Campaign Collab Completed!`; body = `${actorName} marked "${app.campaignTitle}" as complete.`; break;
            case 'rejected': title = `Update on "${app.campaignTitle}"`; body = `Your application was rejected by ${actorName}.`; break;
        }

        if (title && body) {
            await apiService.sendNotificationToUser(recipientId, title, body);
        }
    }
  },

  sendAdSlotRequest: async (requestData: Omit<AdSlotRequest, 'id' | 'status' | 'timestamp'>): Promise<void> => {
    const userDocRef = doc(db, 'users', requestData.brandId);
    const userDoc = await getDoc(userDocRef);
    const user = userDoc.data() as User;

    if (user.membership.plan === 'free' && user.membership.usage.liveTvBookings >= 1) {
        throw new Error("You have reached your Live TV booking limit on the free plan. Please upgrade to Pro.");
    }
    
    await addDoc(collection(db, 'ad_slot_requests'), {
      ...requestData,
      collabId: generateCollabId(),
      status: 'pending_approval',
      timestamp: serverTimestamp(),
    });
    await updateDoc(userDocRef, { 'membership.usage.liveTvBookings': increment(1) });
  },

  updateAdSlotRequest: async (reqId: string, data: Partial<AdSlotRequest>, actorId: string): Promise<void> => {
    const docRef = doc(db, 'ad_slot_requests', reqId);
    await updateDoc(docRef, data);
    
    if (data.status) {
        const reqDoc = await getDoc(docRef);
        if (!reqDoc.exists()) return;
        const req = reqDoc.data() as AdSlotRequest;

        const isActorBrand = actorId === req.brandId;
        const recipientId = isActorBrand ? req.liveTvId : req.brandId;
        const actorName = isActorBrand ? req.brandName : req.liveTvName;

        let title = '';
        let body = '';

        switch (data.status) {
            case 'brand_offer': title = `New Offer for Ad Booking`; body = `${actorName} sent a counter-offer for "${req.campaignName}".`; break;
            case 'agency_offer': title = `New Offer for "${req.campaignName}"`; body = `${actorName} has sent you an offer.`; break;
            case 'in_progress': if (data.paymentStatus === 'paid') { title = `Ad Payment Confirmed!`; body = `Payment for "${req.campaignName}" is complete.`; } break;
            case 'work_submitted': title = `Ad Campaign Submitted`; body = `${actorName} has marked "${req.campaignName}" as submitted/live.`; break;
            case 'completed': title = `Ad Booking Completed`; body = `${actorName} has marked the "${req.campaignName}" booking as complete.`; break;
        }
        if (title && body) {
            await apiService.sendNotificationToUser(recipientId, title, body);
        }
    }
  },

  createBannerAd: async (adData: Omit<BannerAd, 'id' | 'timestamp'>): Promise<void> => {
    await addDoc(collection(db, 'banner_ads'), {
      ...adData,
      timestamp: serverTimestamp(),
    });
  },

  getBannerAds: async (locationQuery: string, settings: PlatformSettings): Promise<BannerAd[]> => {
    const adsRef = collection(db, 'banner_ads');
    let q = query(adsRef);
    if (locationQuery) {
        q = query(adsRef, where('location', '==', locationQuery));
    }
    
    const snapshot = await getDocs(q);
    const allAds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BannerAd));
    
    const activeAgencyIds = await getUsersWithActiveMembership('banneragency');
    
    return allAds.filter(ad => activeAgencyIds.includes(ad.agencyId));
  },

  getBannerAdsForAgency: async (agencyId: string): Promise<BannerAd[]> => {
    const q = query(collection(db, 'banner_ads'), where('agencyId', '==', agencyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BannerAd));
  },

  updateBannerAdBookingRequest: async (reqId: string, data: Partial<BannerAdBookingRequest>, actorId: string): Promise<void> => {
    const docRef = doc(db, 'banner_booking_requests', reqId);
    await updateDoc(docRef, data);

    if (data.status) {
        const reqDoc = await getDoc(docRef);
        if (!reqDoc.exists()) return;
        const req = reqDoc.data() as BannerAdBookingRequest;

        const isActorBrand = actorId === req.brandId;
        const recipientId = isActorBrand ? req.agencyId : req.brandId;
        const actorName = isActorBrand ? req.brandName : req.agencyName;

        let title = '';
        let body = '';

        switch (data.status) {
            case 'brand_offer': title = `New Offer for Banner Ad`; body = `${actorName} sent a counter-offer for "${req.campaignName}".`; break;
            case 'agency_offer': title = `New Offer for "${req.campaignName}"`; body = `${actorName} has sent you an offer.`; break;
            case 'in_progress': if (data.paymentStatus === 'paid') { title = `Banner Ad Payment Confirmed!`; body = `Payment for "${req.campaignName}" is complete.`; } break;
            case 'work_submitted': title = `Banner Ad Live`; body = `${actorName} has marked your banner ad "${req.campaignName}" as live.`; break;
            case 'completed': title = `Banner Ad Booking Completed`; body = `${actorName} has marked the "${req.campaignName}" booking as complete.`; break;
        }
        if (title && body) {
            await apiService.sendNotificationToUser(recipientId, title, body);
        }
    }
  },
  
  sendBannerAdBookingRequest: async (requestData: Omit<BannerAdBookingRequest, 'id' | 'status' | 'timestamp'>): Promise<void> => {
    const userDocRef = doc(db, 'users', requestData.brandId);
    const userDoc = await getDoc(userDocRef);
    const user = userDoc.data() as User;
    
    if (user.membership.plan === 'free' && user.membership.usage.bannerAdBookings >= 1) {
        throw new Error("You have reached your banner ad booking limit on the free plan. Please upgrade to Pro.");
    }

    await addDoc(collection(db, 'banner_booking_requests'), {
      ...requestData,
      collabId: generateCollabId(),
      status: 'pending_approval',
      timestamp: serverTimestamp(),
    });
    await updateDoc(userDocRef, { 'membership.usage.bannerAdBookings': increment(1) });
  },

  activateMembership: async (userId: string, plan: MembershipPlan): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    const durationMap: Record<string, number> = { 'normal_1m': 1, 'normal_6m': 6, 'normal_1y': 12 };
    const monthsToAdd = durationMap[plan] ?? 12; // Default to 1 year for Pro plans

    const now = new Date();
    const expiresAt = new Date(now.setMonth(now.getMonth() + monthsToAdd));

    const newMembership: Membership = {
        plan,
        isActive: true,
        startsAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt),
        usage: { directCollaborations: 0, campaigns: 0, liveTvBookings: 0, bannerAdBookings: 0 }
    };

    const batch = writeBatch(db);

    // Update user document
    batch.update(userRef, { membership: newMembership });

    // Check user role and update corresponding influencer profile if necessary
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
        const user = userDoc.data() as User;
        if (user.role === 'influencer') {
            const influencerRef = doc(db, 'influencers', userId);
            // Update the denormalized flag on the influencer profile for querying
            batch.update(influencerRef, { membershipActive: true });
        }
    }
    
    await batch.commit();
  },

  getAdSlotRequestsForBrand: async (brandId: string): Promise<AdSlotRequest[]> => {
    const q = query(collection(db, 'ad_slot_requests'), where('brandId', '==', brandId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdSlotRequest));
  },
  
  getBannerAdBookingRequestsForBrand: async (brandId: string): Promise<BannerAdBookingRequest[]> => {
    const q = query(collection(db, 'banner_booking_requests'), where('brandId', '==', brandId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BannerAdBookingRequest));
  },

  getActiveAdCollabsForAgency: async (agencyId: string, role: 'livetv' | 'banneragency'): Promise<(AdSlotRequest | BannerAdBookingRequest)[]> => {
    const collectionName = role === 'livetv' ? 'ad_slot_requests' : 'banner_booking_requests';
    const idField = role === 'livetv' ? 'liveTvId' : 'agencyId';
    
    const q = query(collection(db, collectionName), where(idField, '==', agencyId), where('status', 'in', ['in_progress', 'work_submitted']));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdSlotRequest | BannerAdBookingRequest));
  },
  
  submitDailyPayoutRequest: async (requestData: Omit<DailyPayoutRequest, 'id' | 'timestamp'>): Promise<void> => {
    await addDoc(collection(db, 'daily_payout_requests'), {
      ...requestData,
      status: 'pending',
      timestamp: serverTimestamp(),
    });
  },

  uploadPostImage: async (postId: string, file: File): Promise<string> => {
    const storageRef = ref(storage, `post_images/${postId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  },
  
  createPost: async (postData: Omit<Post, 'id'>): Promise<Post> => {
    const docRef = await addDoc(collection(db, 'posts'), postData);
    return { id: docRef.id, ...postData };
  },

  toggleLikePost: async (postId: string, userId: string): Promise<void> => {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    if (postDoc.exists()) {
        const post = postDoc.data() as Post;
        if (post.likes.includes(userId)) {
            await updateDoc(postRef, { likes: arrayRemove(userId) });
        } else {
            await updateDoc(postRef, { likes: arrayUnion(userId) });
        }
    }
  },

  getCommentsForPost: async (postId: string): Promise<Comment[]> => {
    const q = query(collection(db, `posts/${postId}/comments`), orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
  },
  
  addCommentToPost: async (postId: string, commentData: Omit<Comment, 'id' | 'timestamp'>): Promise<void> => {
    const postRef = doc(db, 'posts', postId);
    await addDoc(collection(db, `posts/${postId}/comments`), { ...commentData, timestamp: serverTimestamp() });
    await updateDoc(postRef, { commentCount: increment(1) });
  },

  createTransaction: async (txData: Omit<Transaction, 'id' | 'timestamp'>): Promise<void> => {
    await addDoc(collection(db, 'transactions'), {
        ...txData,
        timestamp: serverTimestamp(),
    });
  },
  
  getTransactionsForUser: async (userId: string): Promise<Transaction[]> => {
    // Client-side sorting to avoid composite index requirement
    const q = query(collection(db, 'transactions'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    return transactions.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
  },

  getPayoutHistoryForUser: async (userId: string): Promise<PayoutRequest[]> => {
    // Client-side sorting to avoid composite index requirement
    const q = query(collection(db, 'payout_requests'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const payouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
    return payouts.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
  },
  
  submitPayoutRequest: async (requestData: Omit<PayoutRequest, 'id' | 'status' | 'timestamp'>): Promise<void> => {
    const batch = writeBatch(db);

    const payload = { ...requestData, status: 'pending' as const, timestamp: serverTimestamp() };

    // Firestore throws an error if any field value is `undefined`.
    // This removes any keys that have an `undefined` value before sending.
    Object.keys(payload).forEach(key => {
        if (payload[key as keyof typeof payload] === undefined) {
            delete (payload as any)[key];
        }
    });
    
    // 1. Create payout request document
    const payoutRef = doc(collection(db, 'payout_requests'));
    batch.set(payoutRef, payload);
    
    // 2. Update collaboration status
    const collabCollectionName = getCollectionNameForCollab(requestData.collaborationType);
    const collabRef = doc(db, collabCollectionName, requestData.collaborationId);
    batch.update(collabRef, { paymentStatus: 'payout_requested' });
    
    await batch.commit();
  },

  sendLiveHelpMessage: async (sessionId: string, senderId: string, senderName: string, text: string): Promise<void> => {
    const sessionRef = doc(db, 'live_help_sessions', sessionId);
    const messagesRef = collection(db, `live_help_sessions/${sessionId}/messages`);

    await addDoc(messagesRef, { senderId, senderName, text, timestamp: serverTimestamp() });
    await updateDoc(sessionRef, { updatedAt: serverTimestamp(), staffHasUnread: true });
  },
  
  closeLiveHelpSession: async (sessionId: string): Promise<void> => {
    await updateDoc(doc(db, 'live_help_sessions', sessionId), { status: 'closed', updatedAt: serverTimestamp() });
  },
  
  createRefundRequest: async (data: Omit<RefundRequest, 'id' | 'status' | 'timestamp'>): Promise<void> => {
    const batch = writeBatch(db);

    const payload = {
        ...data,
        status: 'pending' as const,
        timestamp: serverTimestamp(),
    };

    // Firestore throws an error if any field value is `undefined`.
    // This removes any keys that have an `undefined` value before sending.
    Object.keys(payload).forEach(key => {
        if (payload[key as keyof typeof payload] === undefined) {
            delete (payload as any)[key];
        }
    });

    // 1. Create the refund request document
    const refundRef = doc(collection(db, 'refund_requests'));
    batch.set(refundRef, payload);

    // 2. Update the original collaboration's status
    const collabCollectionName = getCollectionNameForCollab(data.collabType);
    // FIX: Use `collaborationId` instead of `collabId` to reference the document.
    const collabRef = doc(db, collabCollectionName, data.collaborationId);
    batch.update(collabRef, { status: 'refund_pending_admin_review' });

    await batch.commit();
  },

  updatePayoutStatus: async (payoutId: string, status: PayoutRequest['status'], collabId: string, collabType: PayoutRequest['collaborationType'], reason?: string): Promise<void> => {
    const batch = writeBatch(db);
    const payoutRef = doc(db, 'payout_requests', payoutId);
    
    const updateData: Partial<PayoutRequest> = { status };
    if (reason !== undefined) {
        updateData.rejectionReason = reason;
    }
    batch.update(payoutRef, updateData as any);

    if (status === 'approved' || status === 'rejected') {
        const collabCollectionName = getCollectionNameForCollab(collabType);
        const collabRef = doc(db, collabCollectionName, collabId);
        batch.update(collabRef, { paymentStatus: status === 'approved' ? 'payout_complete' : 'paid' });
    }
    await batch.commit();
  },

  updateRefundRequest: async (refundId: string, data: Partial<RefundRequest>): Promise<void> => {
    await updateDoc(doc(db, 'refund_requests', refundId), data);
  },

  updateDailyPayoutRequestStatus: async (requestId: string, collabId: string, collabType: 'ad_slot' | 'banner_booking', status: 'approved' | 'rejected', approvedAmount?: number, reason?: string): Promise<void> => {
    const batch = writeBatch(db);
    const requestRef = doc(db, 'daily_payout_requests', requestId);
    const updateData: any = { status };
    if (reason !== undefined) updateData.rejectionReason = reason;
    if (approvedAmount !== undefined) updateData.approvedAmount = approvedAmount;
    batch.update(requestRef, updateData);

    if (status === 'approved' && approvedAmount && approvedAmount > 0) {
        const collabCollection = collabType === 'ad_slot' ? 'ad_slot_requests' : 'banner_booking_requests';
        const collabRef = doc(db, collabCollection, collabId);
        batch.update(collabRef, { dailyPayoutsReceived: increment(approvedAmount) });
    }
    await batch.commit();
  },

  updateDailyPayoutRequest: async (requestId: string, data: Partial<DailyPayoutRequest>): Promise<void> => {
    await updateDoc(doc(db, 'daily_payout_requests', requestId), data);
  },
  
  updatePayoutRequest: async (payoutId: string, data: Partial<PayoutRequest>): Promise<void> => {
    await updateDoc(doc(db, 'payout_requests', payoutId), data);
  },
};