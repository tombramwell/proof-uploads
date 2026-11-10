import { MongoClient } from 'mongodb';
import WorkspaceClient from './WorkspaceClient';

export default async function ProofWorkspace({ params }) {
  // Unwrap the params for Next.js 15
  const unwrappedParams = await params;
  const proofId = unwrappedParams.id;

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('studio_proofs');
  
  // Fetch all pending amends for this specific proof
  const rawComments = await db.collection('comments')
                              .find({ proofId: proofId, status: { $ne: 'Actioned' } })
                              .sort({ createdAt: 1 }) // Oldest first so they read in chronological order
                              .toArray();

  const comments = rawComments.map(item => ({
    ...item,
    _id: item._id.toString(),
  }));

  return <WorkspaceClient proofId={proofId} comments={comments} />;
}