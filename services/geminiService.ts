import { GoogleGenAI, Type } from "@google/genai";
import { Influencer, UserRole } from '../types';

// Assume process.env.API_KEY is available in the environment
if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMessageDraft = async (influencerName: string, niche: string): Promise<string> => {
  try {
    const ai = getAi();
    const prompt = `Generate a short, friendly, and professional outreach message to an influencer named ${influencerName}. Our brand is BIGYAPON, a platform connecting brands with influencers. Mention that we are impressed with their content in the ${niche} niche and would love to discuss a potential collaboration. Keep it concise and engaging.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating message draft:", error);
    return "Sorry, I couldn't generate a message right now. Please try again.";
  }
};

export const generateCollabProposal = async (influencerName: string, brandName: string, campaignIdea: string): Promise<string> => {
  try {
    const ai = getAi();
    const prompt = `Generate a friendly and professional collaboration proposal message from a brand named "${brandName}" to an influencer named ${influencerName}.
The initial idea for the campaign is: "${campaignIdea}".
The message should:
1. Express admiration for the influencer's content.
2. Clearly state the brand's interest in collaborating.
3. Briefly introduce the campaign idea.
4. Propose discussing details further.
5. Keep the tone enthusiastic and respectful.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating collab proposal:", error);
    return "I'm having trouble drafting a proposal right now. Please try again or write your own.";
  }
};

export const findInfluencersWithAI = async (query: string, influencers: Influencer[]): Promise<string[]> => {
  if (!query.trim()) {
    return influencers.map(i => i.id);
  }

  try {
    const ai = getAi();
    const prompt = `
      You are an advanced filtering algorithm for a talent discovery platform.
      The user wants to find influencers from a list based on their query.
      Analyze the user's query and the provided JSON list of influencers.
      Your task is to return only the IDs of the influencers that match the criteria in the query.

      User Query: "${query}"

      Influencer List (JSON):
      ${JSON.stringify(influencers, null, 2)}

      Respond with a JSON object that strictly adheres to this schema: { "matchingIds": ["string"] }.
      The "matchingIds" array should contain the string IDs of the matching influencers.
      If no influencers match the query, the "matchingIds" array should be empty.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchingIds: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              }
            }
          }
        }
      }
    });

    // Fix: Per Gemini API guidelines, access text output directly via the .text property.
    const jsonText = response.text;
    const result = JSON.parse(jsonText);

    if (result && Array.isArray(result.matchingIds)) {
      return result.matchingIds;
    }

    return [];
  } catch (error) {
    console.error("Error finding influencers with AI:", error);
    return [];
  }
};

export const generateDashboardTip = async (role: UserRole, name: string): Promise<string> => {
  try {
    const ai = getAi();
    const roleDescription = {
      brand: 'a brand manager looking for influencers',
      influencer: 'an influencer looking for brand collaborations',
      livetv: 'a Live TV channel manager looking for advertisers',
      banneragency: 'a banner advertising agency manager',
      staff: 'a platform administrator'
    };
    
    const prompt = `You are a helpful assistant for "BIGYAPON", an influencer marketing platform.
Generate a short, friendly, encouraging, and actionable 'pro tip' for a user.
The user's name is ${name} and they are ${roleDescription[role] || 'a user'}.
The tip should be about how to best use the platform or general industry advice relevant to their role.
Keep it to one or two sentences. Be creative. Do not use markdown.

Example for a brand: "Try using specific keywords like 'eco-friendly' in your AI search to find influencers who truly align with your brand's values!"
Example for an influencer: "Make sure your bio is updated with your latest achievements to attract bigger and better brand deals!"
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating dashboard tip:", error);
    return "Could not generate a tip right now. Why not explore the influencer listings?";
  }
};

export const filterPayoutsWithAI = async (query: string, items: any[]): Promise<string[]> => {
  if (!query.trim()) {
    return items.map(i => i.id);
  }

  try {
    const ai = getAi();
    const prompt = `
      You are an advanced filtering algorithm for a financial dashboard.
      Analyze the user's query and the provided JSON list of payout/refund requests.
      Your task is to return only the IDs of the items that match the criteria in the query.
      The query might be about amounts (e.g., "over 5000", "less than 100"), statuses (e.g., "pending", "rejected refunds"), user names, collaboration titles, or types (e.g., "all refunds", "daily payouts").

      User Query: "${query}"

      Request List (JSON):
      ${JSON.stringify(items.map(item => ({
          id: item.id,
          requestType: item.requestType,
          status: item.status,
          amount: item.amount,
          userName: item.userName,
          collabTitle: item.collabTitle,
          date: item.timestamp?.toDate ? item.timestamp.toDate().toISOString().split('T')[0] : null
      })), null, 2)}

      Respond with a JSON object that strictly adheres to this schema: { "matchingIds": ["string"] }.
      The "matchingIds" array should contain the string IDs of the matching items.
      If no items match the query, the "matchingIds" array should be empty.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchingIds: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    const result = JSON.parse(jsonText);

    if (result && Array.isArray(result.matchingIds)) {
      return result.matchingIds;
    }

    return [];
  } catch (error) {
    console.error("Error filtering payouts with AI:", error);
    // On error, just return all IDs to not break the UI completely
    return items.map(i => i.id);
  }
};

export const filterDisputesWithAI = async (query: string, disputes: any[]): Promise<string[]> => {
  if (!query.trim()) {
    return disputes.map(d => d.id);
  }

  try {
    const ai = getAi();
    const prompt = `
      You are an advanced filtering assistant for a disputes resolution panel.
      Analyze the user's search query and the provided JSON list of disputes.
      Return only the IDs of the disputes that match the criteria in the query.
      The query might ask about specific names, reasoning keywords (e.g., "incomplete work", "fraud", "unresponsive"), statuses (e.g., "open", "resolved"), or dates.

      User Query: "${query}"

      Dispute List (JSON):
      ${JSON.stringify(disputes.map(d => ({
          id: d.id,
          reporter: d.disputedByName,
          against: d.disputedAgainstName,
          reason: d.reason,
          collab: d.collaborationTitle,
          status: d.status,
          date: d.timestamp?.toDate ? d.timestamp.toDate().toISOString().split('T')[0] : null
      })), null, 2)}

      Respond with a JSON object adhering to this schema: { "matchingIds": ["string"] }.
      The "matchingIds" array must contain the string IDs of the matched disputes.
      If no disputes match, return an empty array.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchingIds: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    const result = JSON.parse(jsonText);

    if (result && Array.isArray(result.matchingIds)) {
      return result.matchingIds;
    }
    return [];
  } catch (error) {
    console.error("Error filtering disputes with AI:", error);
    return disputes.map(d => d.id);
  }
};
