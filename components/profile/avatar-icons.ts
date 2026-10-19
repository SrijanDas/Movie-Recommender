import {
  ArmchairIcon,
  CameraIcon,
  ClapperboardIcon,
  DramaIcon,
  FilmIcon,
  GlassesIcon,
  PopcornIcon,
  ProjectorIcon,
  SparklesIcon,
  StarIcon,
  TicketIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react";
import type { AvatarIcon } from "@/lib/profile/avatar";

// The drawing for each preset avatar. No "use client": the share image
// (app/u/[handle]/opengraph-image.tsx) renders these on the server too.
export const AVATAR_ICON_COMPONENTS: Record<AvatarIcon, LucideIcon> = {
  popcorn: PopcornIcon,
  clapperboard: ClapperboardIcon,
  film: FilmIcon,
  ticket: TicketIcon,
  projector: ProjectorIcon,
  video: VideoIcon,
  drama: DramaIcon,
  armchair: ArmchairIcon,
  glasses: GlassesIcon,
  camera: CameraIcon,
  star: StarIcon,
  sparkles: SparklesIcon,
};
