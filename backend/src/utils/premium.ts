import { db } from '../db/index.js';
import { subscriptions } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';

export type UserPlan = 'free' | 'basic' | 'pro';

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const now = new Date();
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        gt(subscriptions.currentPeriodEnd, now),
      ),
    )
    .limit(1);

  if (!sub) return 'free';
  return sub.plan as UserPlan;
}

export async function isPremium(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId);
  return plan !== 'free';
}
