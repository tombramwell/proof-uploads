import { MongoClient, ObjectId } from 'mongodb'; // Add ObjectId here
import { NextResponse } from 'next/server';

// Initialize the MongoDB client once to prevent connection pooling issues on Vercel
let client;
const uri = process.env.MONGODB_URI;

export async function POST(request) {
  try {
    const { proofId, name, comment } = await request.json();
    
    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
    }
    
    const db = client.db('studio_proofs');
    const commentsCollection = db.collection('comments'); 
    
    await commentsCollection.insertOne({
      proofId,
      name,
      comment,
      createdAt: new Date(),
    });

// --- NEW: MULTI-ROOM GOOGLE CHAT NOTIFICATIONS ---
    const teamChatUrl = process.env.GOOGLE_CHAT_WEBHOOK;
    const salesChatUrl = process.env.SALES_CHAT_WEBHOOK; 
    
    const chatRequests = [];

    // 1. The Design/Dev Team Alert (Includes Dashboard Link)
    if (teamChatUrl) {
      const teamPayload = {
        text: `🚨 *New amends submitted!*\n*Proof:* ${proofId}\n<https://reachstudioproof.com/amends|👉 View the Dashboard>`
      };
      
      chatRequests.push(
        fetch(teamChatUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          body: JSON.stringify(teamPayload)
        }).catch(err => console.error('Failed to ping Team Chat:', err))
      );
    }

    // 2. The Sales Team Alert (Clean and Simple)
if (salesChatUrl) {
      const salesPayload = {
        text: `👀 *Client Activity:* Amends were just submitted for proof *${proofId}*.\n<https://reachstudioproof.com/amends/${proofId}|👉 View Requested Amends>`
      };
      
      chatRequests.push(
        fetch(salesChatUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          body: JSON.stringify(salesPayload)
        }).catch(err => console.error('Failed to ping Sales Chat:', err))
      );
    }

    // Fire all configured webhooks concurrently and wait for them to finish
    if (chatRequests.length > 0) {
      await Promise.all(chatRequests);
    }
    // -------------------------------------------------
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// NEW: Handles status updates from the writers' dashboard
export async function PATCH(request) {
  try {
    const { id, status } = await request.json();
    
    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
    }
    
    const db = client.db('studio_proofs');
    
    // Updates the specific comment using its unique MongoDB ID
    await db.collection('comments').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status } }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}