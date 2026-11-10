import { MongoClient } from 'mongodb';
import AmendCard from './AmendCard'; // Import the new interactive card

export const dynamic = 'force-dynamic'; 

export default async function AmendsDashboard() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const db = client.db('studio_proofs');
  
const rawComments = await db.collection('comments')
                              .find({ status: { $ne: 'Actioned' } })
                              .sort({ createdAt: -1 })
                              .toArray();

  // Convert MongoDB ObjectIds to strings so React Client Components can read them
  const comments = rawComments.map(item => ({
    ...item,
    _id: item._id.toString(),
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