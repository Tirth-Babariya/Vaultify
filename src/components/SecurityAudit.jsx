'use client';

export default function SecurityAudit({ passwords }) {
  const getStrength = (pass) => {
    let score = 0;
    if (!pass) return score;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const total = passwords.length;
  if (total === 0) return null;

  const weak = passwords.filter(p => getStrength(p.password) <= 2).length;
  const reused = passwords.filter((p, index) => 
    passwords.some((other, i) => i !== index && other.password === p.password)
  ).length;

  const healthScore = Math.max(0, 100 - (weak / total * 50) - (reused / total * 50));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Vault Health</label>
        <span className={`text-xl font-bold ${
          healthScore > 80 ? 'text-green-500' : healthScore > 50 ? 'text-yellow-500' : 'text-red-500'
        }`}>
          {Math.round(healthScore)}%
        </span>
      </div>
      
      <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${
            healthScore > 80 ? 'bg-green-500' : healthScore > 50 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${healthScore}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-foreground/5 rounded-xl border border-border/50">
          <div className="text-[10px] uppercase font-bold opacity-40 mb-1">Weak</div>
          <div className={`text-lg font-bold ${weak > 0 ? 'text-red-500' : 'text-foreground'}`}>{weak}</div>
        </div>
        <div className="p-3 bg-foreground/5 rounded-xl border border-border/50">
          <div className="text-[10px] uppercase font-bold opacity-40 mb-1">Reused</div>
          <div className={`text-lg font-bold ${reused > 0 ? 'text-yellow-500' : 'text-foreground'}`}>{reused}</div>
        </div>
      </div>

      {healthScore < 100 && (
        <p className="text-[10px] leading-relaxed text-foreground/40 italic">
          Tip: Use the generator to replace weak or reused passwords.
        </p>
      )}
    </div>
  );
}
