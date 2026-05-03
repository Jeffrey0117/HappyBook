import { User, BookOpen, ArrowLeftRight, Award } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { Profile } from '@/integrations/supabase/types'
import type { GameStats } from '@/hooks/use-game-stats'

interface ProfileCardProps {
  profile: Profile
  stats: GameStats
}

const ProfileCard = ({ profile, stats }: ProfileCardProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.name}
            className="w-14 h-14 rounded-full border-2 border-primary/30"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-primary/30">
            <User className="h-7 w-7 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1">
          <h2 className="text-lg font-bold">{profile.name}</h2>
          <p className="text-sm text-primary font-medium">
            Lv.{stats.level} {stats.title}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{stats.xp} XP</span>
          <span>下一級 {stats.nextLevelXp} XP</span>
        </div>
        <Progress value={stats.progress * 100} className="h-2" />
      </div>

      <div className="flex justify-around text-center">
        <StatItem icon={BookOpen} value={stats.bookCount} label="藏書" />
        <StatItem icon={ArrowLeftRight} value={stats.swapCount} label="換出" />
        <StatItem icon={Award} value={stats.earnedBadges.length} label="徽章" />
      </div>

      {stats.earnedBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stats.earnedBadges.map((badge) => (
            <Badge key={badge.id} variant="secondary" className="text-xs">
              {badge.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function StatItem({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export default ProfileCard
