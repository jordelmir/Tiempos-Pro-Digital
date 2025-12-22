import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGO_URI environment variable inside .env.local');
}

// Global cached connection
let cached: any = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

const AuditSchema = new mongoose.Schema(
  {
    actor_id: String,
    action: String,
    target_resource: String,
    details: Object,
    timestamp: { type: Date, default: Date.now },
  },
  { strict: false }
);

// Prevent overwrite
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditSchema);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const { logEntry } = req.body;

    // Fire and forget (optional) or await
    const newLog = new AuditLog(logEntry);
    await newLog.save();

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
