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
  if (total === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-1">Nothing to audit yet</h3>
        <p className="text-foreground/40 text-sm">Add a password to your vault to see its security score.</p>
      </div>
    );
  }

  const weak = passwords.filter(p => getStrength(p.password) <= 2).length;
  const reused = passwords.filter((p, index) => 
    passwords.some((other, i) => i !== index && other.password === p.password)
  ).length;

  const healthScore = Math.max(0, 100 - (weak / total * 50) - (reused / total * 50));
  
  const getHealthStatus = (score) => {
    if (score >= 90) return { label: 'Excellent', color: 'text-green-500', bg: 'bg-green-500/10' };
    if (score >= 70) return { label: 'Good', color: 'text-blue-500', bg: 'bg-blue-500/10' };
    if (score >= 50) return { label: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    return { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500/10' };
  };

  const status = getHealthStatus(healthScore);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block">Vault Security</label>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${status.bg} ${status.color}`}>
              {status.label}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-tighter opacity-30">
              {total}  {total === 1 ? 'Entry' : 'Entries'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold tabular-nums tracking-tighter ${status.color}`}>
            {Math.round(healthScore)}<span className="text-sm opacity-50 ml-0.5">%</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${
              healthScore > 80 ? 'bg-green-500' : healthScore > 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="group p-4 bg-foreground/[0.02] hover:bg-foreground/[0.04] rounded-2xl border border-border/40 transition-all duration-300">
          <div className="text-[9px] uppercase font-bold opacity-30 tracking-widest mb-2 group-hover:opacity-50 transition-opacity">Weak</div>
          <div className={`text-2xl font-bold tabular-nums ${weak > 0 ? 'text-red-500' : 'text-foreground/80'}`}>{weak}</div>
        </div>
        <div className="group p-4 bg-foreground/[0.02] hover:bg-foreground/[0.04] rounded-2xl border border-border/40 transition-all duration-300">
          <div className="text-[9px] uppercase font-bold opacity-30 tracking-widest mb-2 group-hover:opacity-50 transition-opacity">Reused</div>
          <div className={`text-2xl font-bold tabular-nums ${reused > 0 ? 'text-yellow-500' : 'text-foreground/80'}`}>{reused}</div>
        </div>
      </div>

      {healthScore < 100 && (
        <div className="flex gap-2 items-start p-3 bg-foreground/[0.02] rounded-xl border border-border/20">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-foreground/20 mt-0.5">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 1.838a1.75 1.75 0 001.691 2.173h.312a.75.75 0 000-1.5h-.312a.25.25 0 01-.244-.304l.459-1.838A1.75 1.75 0 009.11 9H9z" clipRule="evenodd" />
          </svg>
          <p className="text-[10px] leading-relaxed text-foreground/40 italic">
            Tap on entries to replace weak or reused passwords with generated ones.
          </p>
        </div>
      )}
    </div>
  );
}
