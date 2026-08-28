import type { FishSpecies, MutationDef, Rarity } from './types';

// ===== Fish DB (copy from main game) =====
export const FISH_DB: FishSpecies[] = [
  { id: 'ca-vang-beo', name: 'Cá Vàng Beo', emoji: '🐟', rarity: 'common', minWeight: 0.1, maxWeight: 0.9, baseValue: 8 },
  { id: 'ca-co-soc', name: 'Cá Cờ Sọc Xanh', emoji: '🐠', rarity: 'common', minWeight: 0.2, maxWeight: 1.4, baseValue: 10 },
  { id: 'tom-ti-hon', name: 'Tôm Tí Hon', emoji: '🦐', rarity: 'common', minWeight: 0.05, maxWeight: 0.4, baseValue: 7 },
  { id: 'so-tron-trinh', name: 'Sò Tròn Trĩnh', emoji: '🐚', rarity: 'common', minWeight: 0.1, maxWeight: 0.6, baseValue: 6 },
  { id: 'ca-noc-bong', name: 'Cá Nóc Bồng Bềnh', emoji: '🐡', rarity: 'uncommon', minWeight: 0.5, maxWeight: 2.8, baseValue: 24 },
  { id: 'cua-cang-do', name: 'Cua Càng Đỏ', emoji: '🦀', rarity: 'uncommon', minWeight: 0.4, maxWeight: 2.2, baseValue: 28 },
  { id: 'muc-tim-mo', name: 'Mực Tím Mờ', emoji: '🦑', rarity: 'uncommon', minWeight: 0.8, maxWeight: 4.5, baseValue: 30 },
  { id: 'ca-chep-bac', name: 'Cá Chép Bạc', emoji: '🐡', rarity: 'uncommon', minWeight: 0.6, maxWeight: 3.2, baseValue: 22 },
  { id: 'ca-thu-xanh', name: 'Cá Thu Xanh', emoji: '🐟', rarity: 'rare', minWeight: 1.5, maxWeight: 6, baseValue: 60 },
  { id: 'ca-hoi-vang', name: 'Cá Hồi Vàng', emoji: '🐠', rarity: 'rare', minWeight: 2, maxWeight: 8, baseValue: 70 },
  { id: 'ca-chuon-bac', name: 'Cá Chuồn Bạc', emoji: '🐟', rarity: 'rare', minWeight: 1.2, maxWeight: 5, baseValue: 55 },
  { id: 'muc-khong-lo', name: 'Mực Khổng Lồ', emoji: '🦑', rarity: 'rare', minWeight: 3, maxWeight: 12, baseValue: 80 },
  { id: 'ca-map-trang', name: 'Cá Mập Trắng', emoji: '🦈', rarity: 'epic', minWeight: 50, maxWeight: 200, baseValue: 280 },
  { id: 'ca-ngu-vuong', name: 'Cá Ngư Vương', emoji: '🐟', rarity: 'epic', minWeight: 20, maxWeight: 80, baseValue: 220 },
  { id: 'ca-muc-bach-toc', name: 'Cá Mực Bạch Tộc', emoji: '🦑', rarity: 'epic', minWeight: 15, maxWeight: 60, baseValue: 200 },
  { id: 'ca-ngan-kim', name: 'Cá Ngân Kim', emoji: '🐠', rarity: 'legendary', minWeight: 0.4, maxWeight: 1.5, baseValue: 500 },
  { id: 'rong-bien', name: 'Rồng Biển', emoji: '🐲', rarity: 'legendary', minWeight: 30, maxWeight: 100, baseValue: 600 },
  { id: 'than-ca-vang', name: 'Thần Cá Vàng', emoji: '✨', rarity: 'mythical', minWeight: 0.8, maxWeight: 3, baseValue: 1500 },
];

export const FISH_BY_ID: Record<string, FishSpecies> = FISH_DB.reduce((acc, f) => {
  acc[f.id] = f;
  return acc;
}, {} as Record<string, FishSpecies>);

export const MUTATIONS: MutationDef[] = [
  { id: 'shiny', name: 'Lấp Lánh', emoji: '✨', chance: 0.06, valueMult: 1.8 },
  { id: 'albino', name: 'Bạch Tạng', emoji: '🤍', chance: 0.04, valueMult: 2.2 },
  { id: 'neon', name: 'Phát Sáng', emoji: '💜', chance: 0.03, valueMult: 2.5 },
  { id: 'golden', name: 'Vàng Chóe', emoji: '🌟', chance: 0.02, valueMult: 3 },
  { id: 'rainbow', name: 'Cầu Vồng', emoji: '🌈', chance: 0.01, valueMult: 4 },
  { id: 'ghost', name: 'Bóng Ma', emoji: '👻', chance: 0.008, valueMult: 4.5 },
  { id: 'thunder', name: 'Điện Giật', emoji: '⚡', chance: 0.005, valueMult: 5 },
];

export const MUTATION_BY_ID: Record<string, MutationDef> = MUTATIONS.reduce((acc, m) => {
  acc[m.id] = m;
  return acc;
}, {} as Record<string, MutationDef>);

export const RARITY_META: Record<Rarity, { label: string; color: string; order: number }> = {
  common: { label: 'Phổ Biến', color: 'text-slate-400', order: 1 },
  uncommon: { label: 'Không Phổ Biến', color: 'text-emerald-400', order: 2 },
  rare: { label: 'Hiếm', color: 'text-cyan-400', order: 3 },
  epic: { label: 'Sử Thi', color: 'text-purple-400', order: 4 },
  legendary: { label: 'Huyền Thoại', color: 'text-amber-400', order: 5 },
  mythical: { label: 'Thần Thoại', color: 'text-rose-400', order: 6 },
};

export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];
