export type Profile = {
  id: string; wallet_address: string; username: string;
  backup_email: string; birthday: string | null; country: string | null;
};
export type CharacterLook = {
  face: number; hair: number; body: number; outfit: number;
  skinColor: string; hairColor: string; outfitColor: string; eyeColor: string;
};
export const DEFAULT_LOOK: CharacterLook = {
  face: 1, hair: 1, body: 1, outfit: 1,
  skinColor: "#e8a77e", hairColor: "#392447",
  outfitColor: "#393744", eyeColor: "#38d9ee",
};
export type Character = {
  id: string; character_name: string; level: number; xp: number;
  gold_coin: number; lust_coin: number; appearance: CharacterLook | null;
};

