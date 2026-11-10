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

    // --- NEW: GOOGLE CHAT NOTIFICATION ---
    const chatUrl = process.env.GOOGLE_CHAT_WEBHOOK;
    if (chatUrl) {
      const chatPayload = {
        text: `🚨 *New amends submitted!*\n*Proof:* ${proofId}\n<https://reachstudioproof.com/amends|👉 View the Dashboard>`
      };

      // We DON'T 'await' this fetch. We let it run in the background so 
      // the client's screen shows "Success!" instantly without waiting for Google.
      fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(chatPayload)
      }).catch(err => console.error('Failed to ping Google Chat:', err));
    }
    // -------------------------------------
    
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