// Fix: Import `MembershipPlan` and KYC types to correctly type KYC-related functions.
// Fix: Import LiveHelpSession and LiveHelpMessage to support live help chat functionality.
import { Influencer, Message, User, PlatformSettings, Attachment, CollaborationRequest, CollabRequestStatus, Conversation, ConversationParticipant, Campaign, CampaignApplication, LiveTvChannel, AdSlotRequest, BannerAd, BannerAdBookingRequest, SupportTicket, TicketReply, SupportTicketStatus, Membership, UserRole, PayoutRequest, CampaignApplicationStatus, AdBookingStatus, AnyCollaboration, DailyPayoutRequest, Post, Comment, Dispute, MembershipPlan, Transaction, KycDetails, KycStatus, PlatformBanner, PushNotification, Boost, BoostDuration, LiveHelpSession, LiveHelpMessage, RefundRequest } from '../types';
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
  getCountFromServer
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

const DEFAULT_AVATAR_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDRjMCAwIDAtMSAwLTJoMTJ2Mmg0di00YzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==';

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
    const q = query(usersRef, where('role', '==', role));
    const snapshot = await getDocs(q);

    const activeUserIds: string[] = [];
    snapshot.forEach(doc => {
        const user = doc.data() as User;
        if (isMembershipActive(user.membership)) {
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
        batch.set(docRef, influencer);
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

  getInfluencers: async (settings: PlatformSettings): Promise<Influencer[]> => {
    if (!settings.areInfluencerProfilesPublic) return [];
    
    const influencersCol = collection(db, 'influencers');
    // Membership is always required for creators to be visible
    const activeInfluencerIds = await getUsersWithActiveMembership('influencer');
    if (activeInfluencerIds.length > 0) {
        // Firestore 'in' queries are limited to 30 items. For a larger scale app, this would need pagination or a different approach.
        const influencerChunks = [];
        for (let i = 0; i < activeInfluencerIds.length; i += 30) {
            influencerChunks.push(activeInfluencerIds.slice(i, i + 30));
        }
        
        const promises = influencerChunks.map(chunk => {
            const chunkQuery = query(influencersCol, where(documentId(), 'in', chunk));
            return getDocs(chunkQuery);
        });
        
        const snapshots = await Promise.all(promises);
        return snapshots.flatMap(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Influencer)));
    } else {
        return []; // No active influencers, return empty
    }
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
        isStaffRegistrationEnabled: false,
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
    };
    
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const existingData = docSnap.data();
        // Merge defaults with existing data to ensure all fields are present
        return { ...defaultSettings, ...existingData, payoutSettings: { ...defaultSettings.payoutSettings, ...existingData.payoutSettings } } as PlatformSettings;
    } else {
        // If the document doesn't exist, create it with the full default settings
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
    }
  },

  updatePlatformSettings: async (settings: PlatformSettings): Promise<void> => {
    const docRef = doc(db, 'settings', 'platform');
    await setDoc(docRef, settings);
  },

  // Users
  getAllUsers: async (): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
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
  
    getConversations: async (userId: string, allUsers: User[], allInfluencers: Influencer[]): Promise<Conversation[]> => {
        const messagesRef = collection(db, 'messages');
        const q = query(messagesRef, where('participantIds', 'array-contains', userId));
        const snapshot = await getDocs(q);
        
        const messages = snapshot.docs.map(doc => doc.data() as Message);
        messages.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));

        const conversations: { [key: string]: Conversation } = {};
        const allProfiles: (User | Influencer)[] = [...allUsers, ...allInfluencers];
        
        messages.forEach(message => {
            const otherParticipantId = message.senderId === userId ? message.receiverId : message.senderId;

            if (!conversations[otherParticipantId]) {
                const participantProfile = allProfiles.find(p => p.id === otherParticipantId);
                
                if (participantProfile) {
                     const participant: ConversationParticipant = {
                        id: participantProfile.id,
                        name: participantProfile.name,
                        avatar: participantProfile.avatar || DEFAULT_AVATAR_URL,
                        role: 'role' in participantProfile ? participantProfile.role : 'influencer',
                        handle: 'handle' in participantProfile ? participantProfile.handle : undefined,
                        companyName: 'companyName' in participantProfile ? participantProfile.companyName : undefined,
                    };

                    conversations[otherParticipantId] = {
                        id: otherParticipantId,
                        participant: participant,
                        lastMessage: {
                            text: message.text,
                            timestamp: message.timestamp,
                        },
                    };
                }
            }
        });

        return Object.values(conversations);
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
  
  getCollabRequestsForInfluencer: async (influencerId: string): Promise<CollaborationRequest[]> => {
    const q = query(collection(db, 'collaboration_requests'), where('influencerId', '==', influencerId));
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CollaborationRequest));
    requests.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return requests;
  },

  updateCollaborationRequest: async (reqId: string, data: Partial<CollaborationRequest>): Promise<void> => {
    const docRef = doc(db, 'collaboration_requests', reqId);
    const updateData: any = {...data};

    // If a new offer is being made, move the old one to the history.
    if (data.currentOffer) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const oldRequest = docSnap.data() as CollaborationRequest;
            if (oldRequest.currentOffer) {
                // The new history entry is the PREVIOUS current offer.
                const historyEntry = {
                    ...oldRequest.currentOffer,
                    timestamp: Timestamp.now() // Timestamp when it became history.
                };
                // Use arrayUnion to add it to the history.
                updateData.offerHistory = arrayUnion(historyEntry);
            }
        }
    }

    await updateDoc(docRef, updateData);
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
    const snapshot = await getDocs(q);
    const banners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlatformBanner));
    banners.sort((a, b) => ((b.createdAt as Timestamp)?.toMillis() || 0) - ((a.createdAt as Timestamp)?.toMillis() || 0));
    return banners;
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

  // Payouts
  submitPayoutRequest: async (data: Omit<PayoutRequest, 'id' | 'timestamp' | 'status'>): Promise<void> => {
      await addDoc(collection(db, 'payout_requests'), {
          ...data,
          status: 'pending',
          timestamp: serverTimestamp(),
      });
      // Also update the original collaboration to show payout has been requested
      const collectionName = getCollectionNameForCollab(data.collaborationType);
      const collabRef = doc(db, collectionName, data.collaborationId);
      await updateDoc(collabRef, { paymentStatus: 'payout_requested' });
  },
  
  updatePayoutRequest: async (payoutId: string, data: Partial<PayoutRequest>): Promise<void> => {
    const payoutRef = doc(db, 'payout_requests', payoutId);
    await updateDoc(payoutRef, data);
  },

  getPayoutRequests: async (): Promise<PayoutRequest[]> => {
    const q = query(collection(db, 'payout_requests'));
    const snapshot = await getDocs(q);
    const allPayouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
    const pendingPayouts = allPayouts.filter(p => p.status === 'pending');
    // Sort client-side
    pendingPayouts.sort((a, b) => ((a.timestamp as Timestamp)?.toMillis() || 0) - ((b.timestamp as Timestamp)?.toMillis() || 0));
    return pendingPayouts;
  },

  getAllPayouts: async (): Promise<PayoutRequest[]> => {
      const q = query(collection(db, 'payout_requests'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
  },
  
  getPayoutHistoryForUser: async (userId: string): Promise<PayoutRequest[]> => {
      const q = query(collection(db, 'payout_requests'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const payouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
      payouts.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
      return payouts;
  },
  
  updatePayoutStatus: async (payoutId: string, status: PayoutRequest['status'], collabId: string, collabType: PayoutRequest['collaborationType'], reason?: string): Promise<void> => {
      const payoutRef = doc(db, 'payout_requests', payoutId);
      
      const batch = writeBatch(db);
      
      const updateData: {status: PayoutRequest['status'], rejectionReason?: string} = { status };
      if (reason) updateData.rejectionReason = reason;
      
      batch.update(payoutRef, updateData);

      // Update the original collaboration as well
      const collectionName = getCollectionNameForCollab(collabType);
      const collabRef = doc(db, collectionName, collabId);
      const collabDoc = await getDoc(collabRef);

      let paymentStatusUpdate: AnyCollaboration['paymentStatus'] | undefined;
      if (status === 'approved') {
          paymentStatusUpdate = 'payout_complete';
      } else if (status === 'rejected') {
          // Revert to 'paid' so the user can try again
          paymentStatusUpdate = 'paid';
      }

      if (paymentStatusUpdate && collabDoc.exists()) {
          batch.update(collabRef, { paymentStatus: paymentStatusUpdate });
      }
      
      await batch.commit();
  },

  submitDailyPayoutRequest: async (data: Omit<DailyPayoutRequest, 'id' | 'timestamp' | 'status'>): Promise<void> => {
    await addDoc(collection(db, 'daily_payout_requests'), {
      ...data,
      status: 'pending',
      timestamp: serverTimestamp(),
    });
  },

  getDailyPayoutRequests: async (): Promise<DailyPayoutRequest[]> => {
      const q = query(collection(db, 'daily_payout_requests'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyPayoutRequest));
      requests.sort((a, b) => ((a.timestamp as Timestamp)?.toMillis() || 0) - ((b.timestamp as Timestamp)?.toMillis() || 0));
      return requests;
  },
  
  getAllDailyPayoutRequests: async (): Promise<DailyPayoutRequest[]> => {
    const q = query(collection(db, 'daily_payout_requests'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyPayoutRequest));
  },

  updateDailyPayoutRequest: async (reqId: string, data: Partial<DailyPayoutRequest>): Promise<void> => {
      const reqRef = doc(db, 'daily_payout_requests', reqId);
      await updateDoc(reqRef, data);
  },

  updateDailyPayoutRequestStatus: async (reqId: string, collabId: string, collabType: 'ad_slot' | 'banner_booking', status: 'approved' | 'rejected', amount?: number, reason?: string): Promise<void> => {
      const reqRef = doc(db, 'daily_payout_requests', reqId);
      
      const collectionName = getCollectionNameForCollab(collabType);
      const collabRef = doc(db, collectionName, collabId);
      const collabDoc = await getDoc(collabRef);

      const batch = writeBatch(db);

      const updateData: any = { status };
      if (status === 'approved' && amount) {
          updateData.approvedAmount = amount;
          if (collabDoc.exists()) {
              batch.update(collabRef, { dailyPayoutsReceived: increment(amount) });
          }
      }
      if (status === 'rejected') {
          updateData.rejectionReason = reason || "";
      }

      batch.update(reqRef, updateData);
      await batch.commit();
  },
  
  // FIX: This is one of the functions causing the error. It assumes the Live TV user's ID is the same as the channel ID.
  // It should find the user's channel(s) first, then find the ad requests for those channel IDs.
  getActiveAdCollabsForAgency: async (userId: string, role: 'livetv' | 'banneragency'): Promise<(AdSlotRequest | BannerAdBookingRequest)[]> => {
    if (role === 'banneragency') {
        const q = query(collection(db, 'banner_booking_requests'), where('agencyId', '==', userId), where('status', '==', 'in_progress'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BannerAdBookingRequest));
    }

    if (role === 'livetv') {
        // Step 1: Find all channels owned by the user.
        const channelsQuery = query(collection(db, 'livetv_channels'), where('ownerId', '==', userId));
        const channelsSnapshot = await getDocs(channelsQuery);
        const channelIds = channelsSnapshot.docs.map(doc => doc.id);

        if (channelIds.length === 0) {
            return []; // No channels, no ad requests.
        }

        // Step 2 & 3: Find 'in_progress' ad requests for those channels.
        // Firestore 'in' queries are limited to 30 items. Handle chunking.
        const adRequests: AdSlotRequest[] = [];
        const idChunks: string[][] = [];
        for (let i = 0; i < channelIds.length; i += 30) {
            idChunks.push(channelIds.slice(i, i + 30));
        }

        for (const chunk of idChunks) {
            const requestsQuery = query(
                collection(db, 'ad_slot_requests'), 
                where('liveTvId', 'in', chunk), 
                where('status', '==', 'in_progress')
            );
            const requestsSnapshot = await getDocs(requestsQuery);
            requestsSnapshot.forEach(doc => {
                adRequests.push({ id: doc.id, ...doc.data() } as AdSlotRequest);
            });
        }
        return adRequests;
    }

    return []; // Should not happen given the role type.
  },

  // Transactions
  createTransaction: async (data: Omit<Transaction, 'id' | 'timestamp'>): Promise<void> => {
      await addDoc(collection(db, 'transactions'), {
          ...data,
          timestamp: serverTimestamp(),
      });
  },
  
  getTransactionsForUser: async (userId: string): Promise<Transaction[]> => {
      const q = query(collection(db, 'transactions'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      transactions.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
      return transactions;
  },

  getAllTransactions: async (): Promise<Transaction[]> => {
      const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  },
  
  // Refunds
  createRefundRequest: async (data: Omit<RefundRequest, 'id' | 'timestamp' | 'status'>): Promise<void> => {
    const collectionName = getCollectionNameForCollab(data.collabType);
    const collabRef = doc(db, collectionName, data.collabId);
    const collabDoc = await getDoc(collabRef);

    const batch = writeBatch(db);

    batch.set(doc(collection(db, 'refund_requests')), {
      ...data,
      status: 'pending',
      timestamp: serverTimestamp(),
    });

    if (collabDoc.exists()) {
        batch.update(collabRef, { status: 'rejected', rejectionReason: 'Refund requested by brand.' });
    }

    await batch.commit();
  },

  getRefundRequests: async (): Promise<RefundRequest[]> => {
    const q = query(collection(db, 'refund_requests'), where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    const allRefunds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RefundRequest));
    allRefunds.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return allRefunds;
  },

  getAllRefundRequests: async (): Promise<RefundRequest[]> => {
    const q = query(collection(db, 'refund_requests'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RefundRequest));
  },

  updateRefundRequest: async (refundId: string, data: Partial<RefundRequest>): Promise<void> => {
      const refundRef = doc(db, 'refund_requests', refundId);
      await updateDoc(refundRef, data);
  },
  
  // Fix: Add all missing functions
  // Campaigns
  createCampaign: async (data: Omit<Campaign, 'id' | 'status' | 'timestamp'>): Promise<void> => {
    const userDocRef = doc(db, 'users', data.brandId);
    const userDoc = await getDoc(userDocRef);
    const user = userDoc.data() as User;

    if (user.membership.plan === 'free' && user.membership.usage.campaigns >= 1) {
        throw new Error("You have reached your campaign limit on the free plan. Please upgrade to Pro.");
    }

    await addDoc(collection(db, 'campaigns'), {
      ...data,
      status: 'open',
      timestamp: serverTimestamp(),
      applicantIds: [],
    });

    await updateDoc(userDocRef, {
        'membership.usage.campaigns': increment(1)
    });
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
    const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampaignApplication));
    apps.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return apps;
  },

  getAllOpenCampaigns: async (userLocation?: string): Promise<Campaign[]> => {
    const activeBrandIds = await getUsersWithActiveMembership('brand');
    if (activeBrandIds.length === 0) return [];
    
    const brandIdChunks: string[][] = [];
    for (let i = 0; i < activeBrandIds.length; i += 30) {
        brandIdChunks.push(activeBrandIds.slice(i, i + 30));
    }
    
    let allCampaigns: Campaign[] = [];

    for (const chunk of brandIdChunks) {
        const q = query(collection(db, 'campaigns'), where('status', '==', 'open'), where('brandId', 'in', chunk));
        const snapshot = await getDocs(q);
        const campaignsFromChunk = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
        allCampaigns = [...allCampaigns, ...campaignsFromChunk];
    }
    
    allCampaigns.sort((a, b) => (b.isBoosted ? 1 : 0) - (a.isBoosted ? 1 : 0) || ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));

    if (userLocation && userLocation !== 'All') {
        return allCampaigns.filter(c => !c.location || c.location === 'All' || c.location === userLocation);
    }
    return allCampaigns;
  },

  applyToCampaign: async (data: Omit<CampaignApplication, 'id' | 'status' | 'timestamp'>): Promise<void> => {
    const campaignRef = doc(db, 'campaigns', data.campaignId);
    
    const batch = writeBatch(db);

    const appRef = doc(collection(db, 'campaign_applications'));
    batch.set(appRef, {
        ...data,
        status: 'pending_brand_review',
        timestamp: serverTimestamp(),
    });

    batch.update(campaignRef, {
        applicantIds: arrayUnion(data.influencerId),
    });

    await batch.commit();
  },

  updateCampaignApplication: async (appId: string, data: Partial<CampaignApplication>): Promise<void> => {
    const docRef = doc(db, 'campaign_applications', appId);
    const updateData: any = { ...data };

    // If a new offer is being made, move the old one to the history.
    if (data.currentOffer) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const oldApp = docSnap.data() as CampaignApplication;
            if (oldApp.currentOffer) {
                // The new history entry is the PREVIOUS current offer.
                const historyEntry = {
                    ...oldApp.currentOffer,
                    timestamp: Timestamp.now() // Timestamp when it became history.
                };
                // Use arrayUnion to add it to the history.
                updateData.offerHistory = arrayUnion(historyEntry);
            }
        }
    }
    await updateDoc(docRef, updateData);
  },

  getAllCampaignApplications: async (): Promise<CampaignApplication[]> => {
    const snapshot = await getDocs(collection(db, 'campaign_applications'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampaignApplication));
  },

  getCampaignApplicationsForInfluencer: async (influencerId: string): Promise<CampaignApplication[]> => {
    const q = query(collection(db, 'campaign_applications'), where('influencerId', '==', influencerId));
    const snapshot = await getDocs(q);
    const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampaignApplication));
    apps.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return apps;
  },
  
  // Ad Slots (Live TV)
  sendAdSlotRequest: async (data: Omit<AdSlotRequest, 'id'|'status'|'timestamp'>): Promise<void> => {
    const userDocRef = doc(db, 'users', data.brandId);
    const userDoc = await getDoc(userDocRef);
    const user = userDoc.data() as User;
    if (user.membership.plan === 'free' && user.membership.usage.liveTvBookings >= 1) {
        throw new Error("You have reached your Live TV booking limit on the free plan. Please upgrade to Pro.");
    }
    await addDoc(collection(db, 'ad_slot_requests'), {
        ...data,
        status: 'pending_approval',
        timestamp: serverTimestamp(),
    });
    await updateDoc(userDocRef, { 'membership.usage.liveTvBookings': increment(1) });
  },

  // FIX: This is the second function causing the error. The 'liveTvUserId' is the owner's ID, not the channel's ID.
  // The logic needs to first find the user's channels, then query for requests on those channels.
  getAdSlotRequestsForLiveTv: async (liveTvOwnerId: string): Promise<AdSlotRequest[]> => {
    // Step 1: Find channels owned by the user.
    const channelsQuery = query(collection(db, 'livetv_channels'), where('ownerId', '==', liveTvOwnerId));
    const channelsSnapshot = await getDocs(channelsQuery);
    const channelIds = channelsSnapshot.docs.map(doc => doc.id);

    if (channelIds.length === 0) {
        return [];
    }

    // Step 2: Find all ad requests for those channels. Use an 'in' query.
    // Handle chunking for 'in' query limit.
    const allRequests: AdSlotRequest[] = [];
    const idChunks: string[][] = [];
    for (let i = 0; i < channelIds.length; i += 30) {
        idChunks.push(channelIds.slice(i, i + 30));
    }

    for (const chunk of idChunks) {
        const requestsQuery = query(collection(db, 'ad_slot_requests'), where('liveTvId', 'in', chunk));
        const requestsSnapshot = await getDocs(requestsQuery);
        requestsSnapshot.forEach(doc => {
            allRequests.push({ id: doc.id, ...doc.data() } as AdSlotRequest);
        });
    }

    allRequests.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return allRequests;
  },

  updateAdSlotRequest: async (reqId: string, data: Partial<AdSlotRequest>): Promise<void> => {
      const docRef = doc(db, 'ad_slot_requests', reqId);
      await updateDoc(docRef, data);
  },
  
  getAdSlotRequestsForBrand: async (brandId: string): Promise<AdSlotRequest[]> => {
    const q = query(collection(db, 'ad_slot_requests'), where('brandId', '==', brandId));
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdSlotRequest));
    requests.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return requests;
  },

  getAllAdSlotRequests: async (): Promise<AdSlotRequest[]> => {
      const snapshot = await getDocs(collection(db, 'ad_slot_requests'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdSlotRequest));
  },


  // Banner Ads
  createBannerAd: async (data: Omit<BannerAd, 'id'|'timestamp'>): Promise<void> => {
      await addDoc(collection(db, 'banner_ads'), {
          ...data,
          timestamp: serverTimestamp(),
      });
  },

  getBannerAds: async (cityQuery: string, settings: PlatformSettings): Promise<BannerAd[]> => {
    const activeAgencyIds = await getUsersWithActiveMembership('banneragency');
    if (activeAgencyIds.length === 0) return [];

    let allAds: BannerAd[] = [];
    const agencyIdChunks: string[][] = [];
    for (let i = 0; i < activeAgencyIds.length; i += 30) {
        agencyIdChunks.push(activeAgencyIds.slice(i, i + 30));
    }

    for (const chunk of agencyIdChunks) {
        let q = query(collection(db, 'banner_ads'), where('agencyId', 'in', chunk));
        if (cityQuery) {
            q = query(q, where('location', '==', cityQuery));
        }
        const snapshot = await getDocs(q);
        const adsFromChunk = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BannerAd));
        allAds = [...allAds, ...adsFromChunk];
    }
    
    allAds.sort((a, b) => (b.isBoosted ? 1 : 0) - (a.isBoosted ? 1 : 0) || ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    
    return allAds;
  },

  getBannerAdsForAgency: async (agencyId: string): Promise<BannerAd[]> => {
    const q = query(collection(db, 'banner_ads'), where('agencyId', '==', agencyId));
    const snapshot = await getDocs(q);
    const ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BannerAd));
    // Client-side sort
    ads.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
    return ads;
  },

  sendBannerAdBookingRequest: async (data: Omit<BannerAdBookingRequest, 'id'|'status'|'timestamp'>): Promise<void> => {
    const userDocRef = doc(db, 'users', data.brandId);
    const userDoc = await getDoc(userDocRef);
    const user = userDoc.data() as User;
    if (user.membership.plan === 'free' && user.membership.usage.bannerAdBookings >= 1) {
        throw new Error("You have reached your Banner Ad booking limit on the free plan. Please upgrade to Pro.");
    }
    await addDoc(collection(db, 'banner_booking_requests'), {
        ...data,
        status: 'pending_approval',
        timestamp: serverTimestamp(),
    });
    await updateDoc(userDocRef, { 'membership.usage.bannerAdBookings': increment(1) });
  },

  getBannerAdBookingRequestsForAgency: async (agencyId: string): Promise<BannerAdBookingRequest[]> => {
      const q = query(collection(db, 'banner_booking_requests'), where('agencyId', '==', agencyId));
      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BannerAdBookingRequest));
      requests.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
      return requests;
  },

  updateBannerAdBookingRequest: async (reqId: string, data: Partial<BannerAdBookingRequest>): Promise<void> => {
      const docRef = doc(db, 'banner_booking_requests', reqId);
      await updateDoc(docRef, data);
  },

  getBannerAdBookingRequestsForBrand: async (brandId: string): Promise<BannerAdBookingRequest[]> => {
      const q = query(collection(db, 'banner_booking_requests'), where('brandId', '==', brandId));
      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BannerAdBookingRequest));
      requests.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
      return requests;
  },
  
  getAllBannerAdBookingRequests: async (): Promise<BannerAdBookingRequest[]> => {
      const snapshot = await getDocs(collection(db, 'banner_booking_requests'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BannerAdBookingRequest));
  },
  
  getAllCollaborationRequests: async (): Promise<CollaborationRequest[]> => {
    const snapshot = await getDocs(collection(db, 'collaboration_requests'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CollaborationRequest));
  },

  // Membership
  activateMembership: async (userId: string, plan: MembershipPlan): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    
    let months = 0;
    if (plan === 'normal_1m') months = 1;
    if (plan === 'normal_6m') months = 6;
    if (plan === 'normal_1y' || plan.startsWith('pro_')) months = 12;

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    await updateDoc(userRef, {
        'membership.plan': plan,
        'membership.isActive': true,
        'membership.startsAt': Timestamp.fromDate(now),
        'membership.expiresAt': Timestamp.fromDate(expiresAt),
        'membership.usage': {
            directCollaborations: 0,
            campaigns: 0,
            liveTvBookings: 0,
            bannerAdBookings: 0,
        }
    });
  },

  uploadPostImage: (postId: string, file: File): Promise<string> => {
    const storageRef = ref(storage, `post_images/${postId}`);
    return new Promise((resolve, reject) => {
        uploadBytes(storageRef, file)
            .then(snapshot => getDownloadURL(snapshot.ref))
            .then(resolve)
            .catch(reject);
    });
  },

  createPost: async (postData: Omit<Post, 'id'>): Promise<Post> => {
    const docRef = await addDoc(collection(db, 'posts'), { ...postData, visibility: postData.visibility || 'public' });
    return { id: docRef.id, ...postData, visibility: postData.visibility || 'public' };
  },

  getPosts: async (currentUserId?: string): Promise<Post[]> => {
    const postsRef = collection(db, 'posts');
    // Query 1: All public posts
    const publicQ = query(postsRef, where('visibility', '==', 'public'));
    const publicSnapshot = await getDocs(publicQ);
    let posts = publicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));

    if (currentUserId) {
        // Query 2: Current user's private posts
        const privateQ = query(postsRef, where('userId', '==', currentUserId), where('visibility', '==', 'private'));
        const privateSnapshot = await getDocs(privateQ);
        const privatePosts = privateSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        posts = [...posts, ...privatePosts];
    }

    // Filter out blocked and sort by timestamp in memory to avoid composite index requirement
    posts = posts.filter(p => p.isBlocked !== true);
    posts.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));

    return posts;
  },

  updatePost: async (postId: string, data: Partial<Post>): Promise<void> => {
    await updateDoc(doc(db, 'posts', postId), data);
  },
  
  deletePost: async (postId: string): Promise<void> => {
    await deleteDoc(doc(db, 'posts', postId));
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
    const commentsRef = collection(db, `posts/${postId}/comments`);

    const batch = writeBatch(db);
    batch.set(doc(commentsRef), { ...commentData, timestamp: serverTimestamp() });
    batch.update(postRef, { commentCount: increment(1) });
    await batch.commit();
  },
  
  // KYC
  submitKyc: async (userId: string, details: KycDetails, idProofFile: File | null, selfieFile: File | null): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    let idProofUrl = details.idProofUrl;
    let selfieUrl = details.selfieUrl;

    if (idProofFile) {
        idProofUrl = await apiService.uploadKycFile(userId, idProofFile, 'id_proof');
    }
    if (selfieFile) {
        selfieUrl = await apiService.uploadKycFile(userId, selfieFile, 'selfie');
    }
    
    await updateDoc(userRef, {
        kycStatus: 'pending',
        kycDetails: { ...details, idProofUrl, selfieUrl },
    });
  },

  submitDigilockerKyc: async (userId: string): Promise<void> => {
      // In a real scenario, this would receive verified data from a backend callback
      const dummyData: KycDetails = {
          address: 'Verified via DigiLocker',
          villageTown: 'Verified via DigiLocker',
          pincode: '000000',
          city: 'Verified',
          state: 'Verified',
          district: 'Verified',
      };
      await updateDoc(doc(db, 'users', userId), {
          kycStatus: 'approved',
          kycDetails: dummyData,
      });
  },
  
  getKycSubmissions: async (): Promise<User[]> => {
    const q = query(collection(db, 'users'), where('kycStatus', '==', 'pending'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },
  
  updateKycStatus: async (userId: string, status: KycStatus, reason?: string): Promise<void> => {
    const data: { kycStatus: KycStatus, 'kycDetails.rejectionReason'?: string } = { kycStatus: status };
    if (status === 'rejected' && reason) {
        data['kycDetails.rejectionReason'] = reason;
    }
    await updateDoc(doc(db, 'users', userId), data);
  },
  
  // Live Help
  getOrCreateLiveHelpSession: async (userId: string, userName: string, userAvatar: string, staffId: string): Promise<string> => {
    const sessionsRef = collection(db, 'live_help_sessions');
    const q = query(sessionsRef, where('userId', '==', userId), where('status', '==', 'open'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        return snapshot.docs[0].id;
    } else {
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
    }
  },

  sendLiveHelpMessage: async (sessionId: string, senderId: string, senderName: string, text: string): Promise<void> => {
    const sessionRef = doc(db, 'live_help_sessions', sessionId);
    const messagesRef = collection(db, `live_help_sessions/${sessionId}/messages`);

    const batch = writeBatch(db);

    batch.set(doc(messagesRef), {
        senderId,
        senderName,
        text,
        timestamp: serverTimestamp(),
    });

    // Update timestamp and unread status
    const sessionDoc = await getDoc(sessionRef);
    const sessionData = sessionDoc.data() as LiveHelpSession;
    const isUserSender = senderId === sessionData.userId;

    batch.update(sessionRef, {
        updatedAt: serverTimestamp(),
        staffHasUnread: isUserSender,
        userHasUnread: !isUserSender,
    });
    
    await batch.commit();
  },
  
  closeLiveHelpSession: async (sessionId: string): Promise<void> => {
      const sessionRef = doc(db, 'live_help_sessions', sessionId);
      await updateDoc(sessionRef, {
          status: 'closed',
          updatedAt: serverTimestamp(),
      });
  },

}; // End of apiService object