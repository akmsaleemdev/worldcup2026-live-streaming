/**
 * Player profile (Req 3.5).
 *
 * Server component. Displays a player's identity and statistics: goals,
 * assists, yellow cards, and red cards. Optional roster details (number,
 * position, age, team) are shown when available.
 */

export interface PlayerProfileData {
  id: string;
  name: string;
  number?: number | null;
  position?: string | null;
  age?: number | null;
  photoUrl?: string | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  teamName?: string | null;
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "yellow" | "red";
}) {
  const valueColor =
    accent === "yellow"
      ? "text-yellow-400"
      : accent === "red"
        ? "text-danger"
        : "text-accent";
  return (
    <div className="glass rounded-xl border border-white/10 p-4 text-center">
      <div className={`font-orbitron text-3xl font-black tabular-nums ${valueColor}`}>
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wider text-foreground/60">
        {label}
      </div>
    </div>
  );
}

export function PlayerProfile({ player }: { player: PlayerProfileData }) {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-surface">
          {player.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote player photos vary; optimization handled in a later task
            <img
              src={player.photoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-orbitron text-2xl font-bold text-accent">
              {player.number ?? "?"}
            </span>
          )}
        </div>
        <div>
          <h1 className="font-orbitron text-3xl font-black text-foreground-strong">
            {player.name}
          </h1>
          <p className="text-sm text-foreground/60">
            {[
              player.position,
              player.teamName,
              player.number != null ? `#${player.number}` : null,
              player.age != null ? `Age ${player.age}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Player"}
          </p>
        </div>
      </header>

      <section aria-label="Player statistics">
        <h2 className="mb-4 font-orbitron text-lg font-bold text-foreground-strong">
          Statistics
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Goals" value={player.goals} />
          <StatCard label="Assists" value={player.assists} />
          <StatCard label="Yellow Cards" value={player.yellowCards} accent="yellow" />
          <StatCard label="Red Cards" value={player.redCards} accent="red" />
        </div>
      </section>
    </div>
  );
}

export default PlayerProfile;
