import mongoose, { Document } from "mongoose";

export interface IEmbedding extends Document {
  postId: mongoose.Types.ObjectId;
  chunkText: string;
  chunkIndex: number;
  embedding: number[];
  metadata: {
    title: string;
    author: string;
    createdAt: Date;
  };
}

const embeddingSchema = new mongoose.Schema<IEmbedding>({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
    index: true,
  },
  chunkText: {
    type: String,
    required: true,
  },
  chunkIndex: {
    type: Number,
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
  },
  metadata: {
    title: { type: String, required: true },
    author: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
});

embeddingSchema.index({ postId: 1, chunkIndex: 1 }, { unique: true });
embeddingSchema.index({
  chunkText: "text",
  "metadata.title": "text",
  "metadata.author": "text",
});

export default mongoose.model<IEmbedding>("Embedding", embeddingSchema);
