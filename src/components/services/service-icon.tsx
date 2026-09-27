import { Feather, MicVocal, Music, Sparkles, Target, Trees, Waves, Wine, type LucideProps } from "lucide-react";

const ICONS = { target: Target, feather: Feather, mic: MicVocal, music: Music, waves: Waves, wine: Wine, trees: Trees, sparkles: Sparkles };

export function ServiceIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? Sparkles;
  return <Icon aria-hidden {...props} />;
}
