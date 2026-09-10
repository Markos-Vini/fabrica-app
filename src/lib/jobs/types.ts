export type JobType = "pipeline" | "apk" | "publish";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export type JobRecord = {
  id: string;
  type: JobType;
  orderId: string;
  status: JobStatus;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  attempts: number;
};

export type EnqueueInput = {
  type: JobType;
  orderId: string;
};
