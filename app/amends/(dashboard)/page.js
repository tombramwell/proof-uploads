import { MongoClient } from 'mongodb';
import AmendCard from '../AmendCard'; 

export const dynamic = 'force-dynamic'; 

export default async function AmendsDashboard() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const db = client.db('studio_proofs');
  
  // 1. Fetch all active comments
  const rawComments = await db.collection('comments')
    .find({ status: { $ne: 'Actioned' } })
    .sort({ createdAt: -1 })
    .toArray();

  // 2. Extract an array of unique proofIds from those comments
  const activeProofIds = [...new Set(rawComments.map(c => c.proofId))];

  // 3. Fetch ONLY the proofs that match those active IDs
  const matchingProofs = await db.collection('proofs')
    .find({ proofId: { $in: activeProofIds } })
    .toArray();

  // 4. Create a quick lookup dictionary (e.g., { "ARF-123": { author: "Alice" } })
  const proofMetadata = matchingProofs.reduce((acc, proof) => {
    acc[proof.proofId] = proof;
    return acc;
  }, {});

  // 5. Merge the Author into the comment object and convert ObjectIds for React
  const comments = rawComments.map(item => ({
    ...item,
    _id: item._id.toString(),
    // Cross-reference the dictionary. If the proof is older than this update, fallback to 'Unknown'
    author: proofMetadata[item.proofId]?.author || 'Unknown',
    salesTeam: proofMetadata[item.proofId]?.salesTeam || 'Unknown', 
  }));

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ borderBottom: '2px solid #ececec', paddingBottom: '16px', marginBottom: '32px' }}>
        Reach Studio Proof Amends
      </h1>

      {comments.length === 0 ? (
        <p style={{ color: '#5f6263' }}>No amends have been submitted yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
          {comments.map((item) => (
            <AmendCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}