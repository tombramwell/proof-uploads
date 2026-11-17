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
    
    // 1. Save the new comment
    const commentsCollection = db.collection('comments'); 
    await commentsCollection.insertOne({
      proofId,
      name,
      comment,
      createdAt: new Date(),
    });

    // 2. NEW: Look up the proof metadata to find the sales team
    const proofMeta = await db.collection('proofs').findOne({ proofId: proofId });
    const salesTeam = proofMeta?.salesTeam || 'Unknown';

    // --- CONDITIONAL GOOGLE CHAT NOTIFICATIONS ---
    const teamChatUrl = process.env.GOOGLE_CHAT_WEBHOOK;
    const fieldSalesUrl = process.env.FIELD_SALES_WEBHOOK; 
    const hubSalesUrl = process.env.HUB_SALES_WEBHOOK; 
    
    const chatRequests = [];

    // ALERT 1: The Writing Team (Always fires for every amend)
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

    // ALERT 2: Field Sales (Only fires if the assigned team is 'Field')
    if (fieldSalesUrl && salesTeam === 'Field') {
      const fieldPayload = {
        text: `👀 Amends were just submitted for proof *${proofId}*.\n<https://reachstudioproof.com/amends/${proofId}|👉 View Requested Amends>`
      };
      chatRequests.push(
        fetch(fieldSalesUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          body: JSON.stringify(fieldPayload)
        }).catch(err => console.error('Failed to ping Field Sales Chat:', err))
      );
    }

    // ALERT 3: Hub Sales (Only fires if the assigned team is 'Hub')
    if (hubSalesUrl && salesTeam === 'Hub') {
      const hubPayload = {
        text: `👀 Amends were just submitted for proof *${proofId}*.\n<https://reachstudioproof.com/amends/${proofId}|👉 View Requested Amends>`
      };
      chatRequests.push(
        fetch(hubSalesUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          body: JSON.stringify(hubPayload)
        }).catch(err => console.error('Failed to ping Hub Sales Chat:', err))
      );
    }

    // Fire all configured webhooks concurrently
    if (chatRequests.length > 0) {
      await Promise.all(chatRequests);
    }
    // ---------------------------------------------
    
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