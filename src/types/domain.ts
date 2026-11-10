export type Id = string;
export type HeatState = "ambient" | "active" | "moving" | "hot" | "heater" | "on-fire";
export type AuraState = "calm" | "mint" | "warm" | "radiant";

export interface User { id: Id; email: string; createdAt: string }
export interface Profile { userId: Id; name: string; city?: string; level: number; heat: HeatState; aura: AuraState }
export interface Follow { id: Id; followerId: Id; followedId: Id; createdAt: string }
export interface Connection { id: Id; userIds: [Id, Id]; connectedAt: string }
export interface Circle { userId: Id; reach: number; cities: number; communities: number; skillDomains: number }
export interface Bridge { id: Id; connectorId: Id; userIds: [Id, Id]; potential: number; outcome?: string }
export interface Event { id: Id; name: string; city: string; startsAt: string; worldId?: Id }
export interface Place { id: Id; name: string; category: string; latitude: number; longitude: number }
export interface World { id: Id; name: string; kind: "trip" | "festival" | "campus" | "family" | "company" | "event" }
export interface Quest { id: Id; title: string; credits?: number; xp?: number; status: "available" | "active" | "complete" }
export interface Achievement { id: Id; title: string; earnedAt?: string }
export interface CreditTransaction { id: Id; amount: number; reason: string; createdAt: string }
export interface XPTransaction { id: Id; amount: number; reason: string; createdAt: string }
export interface Heat { userId: Id; state: HeatState; multiplier: number; updatedAt: string }
export interface Aura { userId: Id; state: AuraState; label: string }
export interface Device { id: Id; model: "IDee" | "IDee Pro"; status: "concept" | "prototype" | "future" }
export interface Notification { id: Id; userId: Id; title: string; read: boolean; createdAt: string }