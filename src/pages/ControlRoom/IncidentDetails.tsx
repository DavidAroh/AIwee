import { useParams, useNavigate } from 'react-router-dom';
import { useIncidentStore } from '../../store/useIncidentStore';
import { ArrowLeft, ShieldAlert, MapPin, Activity, CheckCircle2, AlertTriangle, Clock, Search, Send, CheckSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import MapView from '../../components/Map';

export default function IncidentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incidents, closeIncident, addAlert } = useIncidentStore();
  
  const incident = incidents.find(i => i.id === id);

  if (!incident) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        <p>Incident not found.</p>
      </div>
    );
  }

  const handleDispatch = () => {
    addAlert({
      incidentId: incident.id,
      type: 'URGENT',
      message: `Major ${incident.type.toLowerCase()} reported nearby. Avoid the area. Emergency services are on the way.`,
      radiusKm: 3,
    });
    alert('Alert dispatched to nearby users.');
  };

  const handleClose = () => {
    closeIncident(incident.id);
    navigate('/control');
  };

  return (
    <div className="flex h-full bg-zinc-50">
      {/* Main Details Panel */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <button 
          onClick={() => navigate('/control')}
          className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider",
                  incident.type === 'Accident' ? 'bg-amber-100 text-amber-700' :
                  incident.type === 'Fire' ? 'bg-red-100 text-red-700' :
                  incident.type === 'Crime' ? 'bg-blue-100 text-blue-700' :
                  incident.type === 'Medical' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-zinc-100 text-zinc-700'
                )}>
                  {incident.type}
                </span>
                {incident.status === 'VERIFIED' ? (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                    <Clock className="w-4 h-4" /> Unverified
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-zinc-900 tracking-tight leading-tight">
                {incident.summary || incident.description}
              </h1>
              <p className="text-zinc-500 font-medium mt-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Reported {formatDistanceToNow(new Date(incident.timestamp), { addSuffix: true })}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2 bg-zinc-100 px-4 py-2 rounded-xl">
                <Activity className="w-5 h-5 text-blue-500" />
                <span className="font-bold text-zinc-700">{incident.confidenceScore}% Confidence</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-100 px-4 py-2 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-bold text-zinc-700">Severity {incident.severityScore}/10</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-zinc-100">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Original Description</h3>
              <p className="text-zinc-800 text-lg leading-relaxed bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                {incident.description}
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">AI Extracted Cues</h3>
              <div className="flex flex-wrap gap-2">
                {incident.cues.map((cue, i) => (
                  <span key={i} className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-lg text-sm font-medium">
                    {cue}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {incident.mediaUrl && (
            <div className="pt-6 border-t border-zinc-100 space-y-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Media Evidence</h3>
              <img src={incident.mediaUrl} alt="Incident" className="w-full max-h-96 object-cover rounded-2xl border border-zinc-200" />
            </div>
          )}
        </div>

        {/* Grounding Data */}
        <div className="grid grid-cols-2 gap-8">
          {/* Search Grounding */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Search className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Social & Web Corroboration</h3>
            </div>
            
            {incident.corroboratingEvidence && incident.corroboratingEvidence.length > 0 ? (
              <ul className="space-y-3">
                {incident.corroboratingEvidence.map((ev, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-zinc-700 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{ev}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-zinc-500 italic bg-zinc-50 p-4 rounded-xl border border-zinc-100">No corroborating web evidence found yet.</p>
            )}
          </div>

          {/* Maps Grounding */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <MapPin className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Nearby Emergency Services</h3>
            </div>
            
            {incident.nearbyPlaces && incident.nearbyPlaces.length > 0 ? (
              <ul className="space-y-3">
                {incident.nearbyPlaces.map((place, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-zinc-700 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    <MapPin className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{place}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-zinc-500 italic bg-zinc-50 p-4 rounded-xl border border-zinc-100">No nearby services identified automatically.</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Sidebar */}
      <div className="w-80 bg-white border-l border-zinc-200 p-8 flex flex-col shadow-xl z-10">
        <h3 className="text-lg font-bold text-zinc-900 tracking-tight mb-6">Actions</h3>
        
        <div className="space-y-4 flex-1">
          <button 
            onClick={handleDispatch}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold transition-all shadow-md hover:shadow-lg"
          >
            <Send className="w-5 h-5" /> Dispatch Alert
          </button>
          
          <button 
            onClick={handleClose}
            className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 py-4 rounded-2xl font-bold transition-all border border-zinc-200"
          >
            <CheckSquare className="w-5 h-5" /> Mark Resolved
          </button>
        </div>

        <div className="mt-auto pt-8 border-t border-zinc-100">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Location Map</h4>
          <div className="h-48 rounded-2xl overflow-hidden border border-zinc-200">
            <MapView center={[incident.latitude, incident.longitude]} zoom={15} height="100%" />
          </div>
        </div>
      </div>
    </div>
  );
}
