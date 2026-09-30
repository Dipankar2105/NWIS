import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Header from '../components/Header';
import { geoService, wellsService, eventsService, extractErrorMessage } from '../services/api';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Filter,
  Layers,
  Crosshair,
  Maximize2,
  Calendar,
  AlertTriangle,
  Clock,
  Activity,
  FileText,
  ArrowRight,
  TrendingUp,
  MapPin,
  Compass,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Loader2,
  RotateCcw
} from 'lucide-react';

// Fix default leaflet icon URLs in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Leaflet DivIcons matching design
const createWellIcon = (status, isSelected, label, distance) => {
  let bgClass = 'bg-[#0070F3] border-white';
  let badgeColor = 'bg-[#0070F3]';
  let ringColor = 'border-[#0070F3]';

  if (isSelected) {
    bgClass = 'bg-[#10B981] border-white shadow-[0_0_0_4px_rgba(16,185,129,0.3)]';
    badgeColor = 'bg-[#0B1527] border border-[#10B981] text-[#10B981]';
  } else if (status === 'critical' || status === 'high_risk') {
    bgClass = 'bg-[#E11D48] border-white shadow-[0_0_0_3px_rgba(225,29,72,0.3)]';
    badgeColor = 'bg-[#0B1527] border border-[#E11D48] text-white';
  } else if (status === 'medium_risk' || status === 'warning') {
    bgClass = 'bg-[#F59E0B] border-white shadow-[0_0_0_3px_rgba(245,158,11,0.3)]';
    badgeColor = 'bg-[#0B1527] border border-[#F59E0B] text-white';
  } else if (status === 'completed') {
    bgClass = 'bg-[#0070F3] border-white';
    badgeColor = 'bg-[#0B1527] border border-[#0070F3] text-white';
  } else {
    bgClass = 'bg-[#64748B] border-white';
    badgeColor = 'bg-[#0B1527] border border-[#64748B] text-slate-300';
  }

  const html = `
    <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -100%);">
      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full ${badgeColor} shadow-md text-[10px] font-bold whitespace-nowrap mb-1">
        <span>${label}</span>
        ${distance ? `<span class="text-[9px] opacity-80">${distance}</span>` : ''}
      </div>
      <div class="w-5 h-5 rounded-full ${bgClass} border-2 flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-125">
        <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
      </div>
      <div class="w-1.5 h-1.5 rotate-45 bg-[#0B1527] -mt-1"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-nwis-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

function MapViewRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function NearbyWells() {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('Duliajan Field');
  const [statusFilter, setStatusFilter] = useState('All');
  const [formationFilter, setFormationFilter] = useState('All');
  const [wellTypeFilter, setWellTypeFilter] = useState('All');
  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [mapLayer, setMapLayer] = useState('satellite'); // 'satellite' | 'streets' | 'dark'

  // Primary Active Well
  const [activeWell, setActiveWell] = useState({
    id: 'DUL-235',
    well_name: 'DUL-235',
    status: 'ACTIVE DRILLING',
    operational_area: 'Duliajan',
    field_name: 'Duliajan Field',
    current_depth: 3842,
    target_depth: 4200,
    formation: 'Barail',
    latitude: 27.3582,
    longitude: 95.3194,
    events_count: 7,
    npt_ytd_hours: 4.5,
    risk_level: 'Medium',
    spud_date: '14 May 2026'
  });

  // Selected Well (for right side inspection card)
  const [selectedWell, setSelectedWell] = useState(null);

  // List of nearby offset wells from backend
  const [nearbyWells, setNearbyWells] = useState([]);
  const [historicalEvents, setHistoricalEvents] = useState([]);

  // Fetch data
  const fetchNearbyData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Query wells in radius
      const geoResponse = await geoService.getWellsInRadius(
        activeWell.latitude,
        activeWell.longitude,
        radiusKm
      );

      // 2. Query all wells to enrich metadata
      const wellsResponse = await wellsService.getAll({ page_size: 50 });
      const allWells = wellsResponse?.wells || [];

      // 3. Query events
      const eventsResponse = await eventsService.getAll({ page_size: 100 });
      const eventsList = eventsResponse?.events || [];
      setHistoricalEvents(eventsList);

      // Map & fallback enrich nearby wells
      const fallbackNearby = [
        {
          id: 'DUL-201',
          well_name: 'DUL-201',
          distance_meters: 3200,
          latitude: 27.3820,
          longitude: 95.3050,
          status: 'Completed',
          formation: 'Barail',
          current_depth: 3950,
          risk_level: 'High Risk',
          event_count: 5,
          relevance_reason: 'Same formation • Similar depth • Historical mud-loss event'
        },
        {
          id: 'DUL-205',
          well_name: 'DUL-205',
          distance_meters: 3400,
          latitude: 27.3340,
          longitude: 95.3380,
          status: 'Drilling',
          formation: 'Barail',
          current_depth: 3780,
          risk_level: 'High Risk',
          event_count: 4,
          relevance_reason: 'Similar depth range • High torque event'
        },
        {
          id: 'DUL-198',
          well_name: 'DUL-198',
          distance_meters: 4800,
          latitude: 27.3710,
          longitude: 95.3620,
          status: 'Completed',
          formation: 'Tipam',
          current_depth: 3620,
          risk_level: 'Medium Risk',
          event_count: 6,
          relevance_reason: 'Adjacent fault block • Bit bounce recorded'
        },
        {
          id: 'DUL-176',
          well_name: 'DUL-176',
          distance_meters: 6100,
          latitude: 27.4080,
          longitude: 95.3510,
          status: 'Standby',
          formation: 'Barail',
          current_depth: 4100,
          risk_level: 'Medium Risk',
          event_count: 3,
          relevance_reason: 'Regional offset • Pressure ramp observed'
        },
        {
          id: 'DUL-190',
          well_name: 'DUL-190',
          distance_meters: 7400,
          latitude: 27.3120,
          longitude: 95.2650,
          status: 'Completed',
          formation: 'Barail',
          current_depth: 3890,
          risk_level: 'Low Risk',
          event_count: 4,
          relevance_reason: 'Stable mud window baseline'
        },
        {
          id: 'DUL-164',
          well_name: 'DUL-164',
          distance_meters: 8200,
          latitude: 27.3190,
          longitude: 95.3950,
          status: 'Completed',
          formation: 'Tipam',
          current_depth: 3450,
          risk_level: 'Low Risk',
          event_count: 2,
          relevance_reason: 'Upper stratigraphy control'
        },
        {
          id: 'DUL-221',
          well_name: 'DUL-221',
          distance_meters: 9100,
          latitude: 27.2890,
          longitude: 95.2890,
          status: 'Completed',
          formation: 'Girujan',
          current_depth: 2950,
          risk_level: 'Low Risk',
          event_count: 1,
          relevance_reason: 'Clay swelling calibration'
        }
      ];

      if (geoResponse && geoResponse.length > 0) {
        // Merge real backend data with design layout
        const merged = geoResponse.map((w, idx) => ({
          id: w.id || `DUL-${200 + idx}`,
          well_name: w.well_name || `WELL-${w.id?.slice(0, 4)}`,
          distance_meters: w.distance_meters || 2000 + idx * 1000,
          latitude: w.latitude || activeWell.latitude + (idx * 0.015 - 0.03),
          longitude: w.longitude || activeWell.longitude + (idx * 0.018 - 0.025),
          status: w.status || 'Completed',
          formation: w.formation_tops?.[0]?.formation || 'Barail',
          current_depth: w.total_depth_md || 3800,
          risk_level: (w.event_count > 4 ? 'High Risk' : w.event_count > 2 ? 'Medium Risk' : 'Low Risk'),
          event_count: w.event_count || (idx % 4 + 1),
          relevance_reason: 'Same formation • Offset telemetry matched'
        }));
        setNearbyWells(merged);
        setSelectedWell(merged[0] || activeWell);
      } else {
        setNearbyWells(fallbackNearby);
        setSelectedWell(fallbackNearby[0]);
      }
    } catch (err) {
      console.warn('Using enriched fallback wells for map:', err);
      // Fallback
      setNearbyWells([
        {
          id: 'DUL-201',
          well_name: 'DUL-201',
          distance_meters: 3200,
          latitude: 27.3820,
          longitude: 95.3050,
          status: 'Completed',
          formation: 'Barail',
          current_depth: 3950,
          risk_level: 'High Risk',
          event_count: 5,
          relevance_reason: 'Same formation • Similar depth • Historical mud-loss event'
        },
        {
          id: 'DUL-205',
          well_name: 'DUL-205',
          distance_meters: 3400,
          latitude: 27.3340,
          longitude: 95.3380,
          status: 'Drilling',
          formation: 'Barail',
          current_depth: 3780,
          risk_level: 'High Risk',
          event_count: 4,
          relevance_reason: 'Similar depth range • High torque event'
        },
        {
          id: 'DUL-198',
          well_name: 'DUL-198',
          distance_meters: 4800,
          latitude: 27.3710,
          longitude: 95.3620,
          status: 'Completed',
          formation: 'Tipam',
          current_depth: 3620,
          risk_level: 'Medium Risk',
          event_count: 6,
          relevance_reason: 'Adjacent fault block • Bit bounce recorded'
        },
        {
          id: 'DUL-176',
          well_name: 'DUL-176',
          distance_meters: 6100,
          latitude: 27.4080,
          longitude: 95.3510,
          status: 'Standby',
          formation: 'Barail',
          current_depth: 4100,
          risk_level: 'Medium Risk',
          event_count: 3,
          relevance_reason: 'Regional offset • Pressure ramp observed'
        },
        {
          id: 'DUL-190',
          well_name: 'DUL-190',
          distance_meters: 7400,
          latitude: 27.3120,
          longitude: 95.2650,
          status: 'Completed',
          formation: 'Barail',
          current_depth: 3890,
          risk_level: 'Low Risk',
          event_count: 4,
          relevance_reason: 'Stable mud window baseline'
        }
      ]);
      setSelectedWell(activeWell);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearbyData();
  }, [radiusKm, selectedArea]);

  // Filtered wells
  const filteredWells = useMemo(() => {
    return nearbyWells.filter(well => {
      if (searchQuery && !well.well_name.toLowerCase().includes(searchQuery.toLowerCase()) && !well.id.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'All' && well.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (formationFilter !== 'All' && !well.formation.toLowerCase().includes(formationFilter.toLowerCase())) {
        return false;
      }
      if (severityFilter !== 'All') {
        if (severityFilter === 'High' && !well.risk_level.includes('High')) return false;
        if (severityFilter === 'Medium' && !well.risk_level.includes('Medium')) return false;
        if (severityFilter === 'Low' && !well.risk_level.includes('Low')) return false;
      }
      return true;
    });
  }, [nearbyWells, searchQuery, statusFilter, formationFilter, severityFilter]);

  // Map Tile URL based on layer
  const tileUrl = useMemo(() => {
    if (mapLayer === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    } else if (mapLayer === 'dark') {
      return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  }, [mapLayer]);

  const mapCenter = [activeWell.latitude, activeWell.longitude];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F4F6F9]">
        {/* Header */}
        <Header />

        {/* Page Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Subheader Title & Breadcrumb */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Well Intelligence</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 font-semibold">Nearby Wells</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0B1527] tracking-tight mt-0.5">
                Nearby & Offset Wells
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Explore nearby wells, historical drilling context and operational events
              </p>
            </div>

            {/* Quick Actions / Field Selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                <MapPin className="w-4 h-4 text-[#E11D48] mr-2" />
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer pr-2"
                >
                  <option value="Duliajan Field">Duliajan Field</option>
                  <option value="Moran Field">Moran Field</option>
                  <option value="Digboi Field">Digboi Field</option>
                  <option value="Naharkatiya Field">Naharkatiya Field</option>
                </select>
              </div>

              <button
                onClick={fetchNearbyData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition shadow-sm"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-3.5 flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search well by ID or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0070F3] focus:outline-none transition"
              />
            </div>

            {/* Radius Toggle Buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">Radius</span>
              {[5, 10, 25].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadiusKm(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    radiusKm === r
                      ? 'bg-[#0B1527] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Well Status */}
              <div className="flex flex-col">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="All">Status: All</option>
                  <option value="Drilling">Drilling</option>
                  <option value="Completed">Completed</option>
                  <option value="Standby">Standby</option>
                </select>
              </div>

              {/* Formation */}
              <div className="flex flex-col">
                <select
                  value={formationFilter}
                  onChange={(e) => setFormationFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="All">Formation: All</option>
                  <option value="Barail">Barail</option>
                  <option value="Tipam">Tipam</option>
                  <option value="Girujan">Girujan</option>
                  <option value="Bokabil">Bokabil</option>
                </select>
              </div>

              {/* Severity */}
              <div className="flex flex-col">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="All">Severity: All</option>
                  <option value="High">High Severity</option>
                  <option value="Medium">Medium Severity</option>
                  <option value="Low">Low Severity</option>
                </select>
              </div>

              {/* Date Range dummy selector */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Select range</span>
              </div>

              {/* Apply Filters Button */}
              <button
                onClick={fetchNearbyData}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0B1527] text-white text-xs font-bold rounded-lg hover:bg-[#1E293B] transition shadow-sm"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>

          {/* Main 2-Column Content: Map (Left 70%) & Well Intelligence (Right 30%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
            {/* Map Column (8 Cols / ~68%) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden relative flex flex-col min-h-[560px]">
              {/* Map Canvas */}
              <div className="relative flex-1 w-full h-full min-h-[540px]">
                <MapContainer
                  center={mapCenter}
                  zoom={12}
                  scrollWheelZoom={true}
                  className="w-full h-full z-0"
                  style={{ height: '100%', width: '100%', minHeight: '540px' }}
                >
                  <TileLayer
                    url={tileUrl}
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Earthstar Geographics'
                  />
                  <MapViewRecenter center={mapCenter} zoom={12} />

                  {/* Concentric Range Rings (5 km & 10 km) */}
                  <Circle
                    center={mapCenter}
                    radius={5000}
                    pathOptions={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fillColor: 'rgba(0, 112, 243, 0.05)',
                      fillOpacity: 0.1,
                      weight: 1.5,
                      dashArray: '5, 6'
                    }}
                  />
                  <Circle
                    center={mapCenter}
                    radius={10000}
                    pathOptions={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fillColor: 'transparent',
                      weight: 1.5,
                      dashArray: '6, 8'
                    }}
                  />

                  {/* Active Well Marker */}
                  <Marker
                    position={mapCenter}
                    icon={createWellIcon('drilling', true, `${activeWell.well_name} Active Well`, null)}
                    eventHandlers={{
                      click: () => setSelectedWell(activeWell),
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-2 text-slate-900">
                        <div className="font-bold text-sm text-[#0B1527]">{activeWell.well_name} (Active Well)</div>
                        <div className="text-xs text-emerald-600 font-semibold mt-0.5">● ACTIVE DRILLING</div>
                        <div className="text-xs text-slate-600 mt-1">Depth: {activeWell.current_depth} m</div>
                        <div className="text-xs text-slate-600">Formation: {activeWell.formation}</div>
                        <button
                          onClick={() => navigate(`/wells/${activeWell.id}`)}
                          className="mt-2 text-xs bg-[#0B1527] text-white px-2.5 py-1 rounded font-bold w-full"
                        >
                          View Well Intelligence
                        </button>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Offset Wells Markers */}
                  {filteredWells.map((well) => (
                    <Marker
                      key={well.id}
                      position={[well.latitude, well.longitude]}
                      icon={createWellIcon(
                        well.risk_level?.toLowerCase().includes('high') ? 'critical' :
                        well.risk_level?.toLowerCase().includes('medium') ? 'medium_risk' : 'completed',
                        selectedWell?.id === well.id,
                        well.well_name,
                        `${(well.distance_meters / 1000).toFixed(1)} km`
                      )}
                      eventHandlers={{
                        click: () => setSelectedWell(well),
                      }}
                    >
                      <Popup className="custom-popup">
                        <div className="p-2 text-slate-900">
                          <div className="font-bold text-sm text-[#0B1527]">{well.well_name}</div>
                          <div className="text-xs text-slate-500 font-medium">
                            Distance: {(well.distance_meters / 1000).toFixed(1)} km
                          </div>
                          <div className="text-xs text-slate-600 mt-1">Status: {well.status}</div>
                          <div className="text-xs text-slate-600">Formation: {well.formation}</div>
                          <div className="text-xs text-slate-600">Events Recorded: {well.event_count}</div>
                          <button
                            onClick={() => navigate(`/wells/${well.id}`)}
                            className="mt-2 text-xs bg-[#0070F3] text-white px-2.5 py-1 rounded font-bold w-full"
                          >
                            Inspect Offset Profile
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>

                {/* Overlay: Top-Left Well Markers Legend */}
                <div className="absolute top-4 left-4 z-[400] bg-[#0B1527]/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-3 shadow-xl text-white max-w-[210px]">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 pb-2 border-b border-slate-700/60">
                    <Compass className="w-3.5 h-3.5 text-[#0070F3]" />
                    <span>Well Markers</span>
                  </div>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#10B981] border border-white"></div>
                      <span className="text-slate-200 text-[11px] font-medium">Active Well (Selected)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#0070F3] border border-white"></div>
                      <span className="text-slate-200 text-[11px] font-medium">Offset Well</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#E11D48] border border-white"></div>
                      <span className="text-slate-200 text-[11px] font-medium">Event (High Severity)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#F59E0B] border border-white"></div>
                      <span className="text-slate-200 text-[11px] font-medium">Event (Medium Severity)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#64748B] border border-white"></div>
                      <span className="text-slate-200 text-[11px] font-medium">Event (Low Severity)</span>
                    </div>
                  </div>
                </div>

                {/* Overlay: North Indicator Top-Right */}
                <div className="absolute top-4 right-4 z-[400] bg-[#0B1527]/80 backdrop-blur-md border border-slate-700/60 w-8 h-8 rounded-full flex flex-col items-center justify-center shadow-lg text-white">
                  <span className="text-[10px] font-bold text-red-400">N</span>
                  <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-red-400 -mt-0.5"></div>
                </div>

                {/* Overlay: Range Rings Labels (5 km & 10 km) */}
                <div className="absolute top-[28%] left-[45%] -translate-x-1/2 z-[400] pointer-events-none">
                  <span className="px-2 py-0.5 rounded-full bg-[#0B1527]/80 text-[10px] font-bold text-white border border-slate-600/50">
                    5 km
                  </span>
                </div>
                <div className="absolute top-[12%] left-[45%] -translate-x-1/2 z-[400] pointer-events-none">
                  <span className="px-2 py-0.5 rounded-full bg-[#0B1527]/80 text-[10px] font-bold text-white border border-slate-600/50">
                    10 km
                  </span>
                </div>

                {/* Overlay: Bottom-Left Scale Bar */}
                <div className="absolute bottom-4 left-4 z-[400] bg-[#0B1527]/80 backdrop-blur-md border border-slate-700/60 rounded-lg px-2.5 py-1 shadow-lg text-white flex items-center gap-2">
                  <div className="w-16 h-1 bg-white relative">
                    <div className="absolute left-0 top-1 text-[8px] font-bold text-slate-300">0</div>
                    <div className="absolute left-1/2 -translate-x-1/2 top-1 text-[8px] font-bold text-slate-300">2.5</div>
                    <div className="absolute right-0 top-1 text-[8px] font-bold text-slate-300">5 km</div>
                  </div>
                </div>

                {/* Overlay: Bottom-Right Map Controls */}
                <div className="absolute bottom-4 right-4 z-[400] flex items-center gap-2">
                  {/* Layer Selector */}
                  <div className="flex bg-[#0B1527]/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 shadow-xl text-white">
                    <button
                      onClick={() => setMapLayer(mapLayer === 'satellite' ? 'streets' : 'satellite')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg hover:bg-slate-700/50 transition"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#0070F3]" />
                      <span className="capitalize">Layers</span>
                    </button>
                    <button
                      onClick={() => {}}
                      className="p-1.5 rounded-lg hover:bg-slate-700/50 transition"
                      title="Center Active Well"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-slate-300" />
                    </button>
                    <button
                      onClick={() => {}}
                      className="p-1.5 rounded-lg hover:bg-slate-700/50 transition"
                      title="Toggle Fullscreen"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-slate-300" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Selected Well & Nearby List (4 Cols / ~32%) */}
            <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
              {/* Selected Well Intelligence Hero Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                    <MapPin className="w-4 h-4 text-[#0070F3]" />
                    <span>Selected Well</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <button className="p-1 hover:text-slate-700 rounded transition">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:text-slate-700 rounded transition">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Well Header with Rig Photo */}
                <div className="flex items-center gap-3.5 mt-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex-shrink-0 relative">
                    <img
                      src="/assets/well-hero-rig.png"
                      alt="Rig"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[#0B1527] truncate">
                        {selectedWell?.well_name || activeWell.well_name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        {selectedWell?.status || activeWell.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-xs">
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 block">Field</span>
                        <span className="font-semibold text-slate-700">{selectedWell?.field_name || activeWell.field_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 block">Current Depth</span>
                        <span className="font-semibold text-slate-800 font-mono">{selectedWell?.current_depth?.toLocaleString() || activeWell.current_depth} m</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] font-medium text-slate-400 block">Formation</span>
                        <span className="font-semibold text-slate-700">{selectedWell?.formation || activeWell.formation}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Metric Tiles */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                    <div className="flex items-center justify-center text-red-500 mb-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      <span className="text-[10px] font-bold text-slate-500">Events</span>
                    </div>
                    <div className="text-lg font-bold text-[#0B1527] font-mono">
                      {selectedWell?.event_count || activeWell.events_count}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                    <div className="flex items-center justify-center text-slate-500 mb-0.5">
                      <Clock className="w-3.5 h-3.5 mr-1 text-[#0070F3]" />
                      <span className="text-[10px] font-bold text-slate-500">NPT (YTD)</span>
                    </div>
                    <div className="text-lg font-bold text-[#0B1527] font-mono">
                      {activeWell.npt_ytd_hours} hr
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                    <div className="flex items-center justify-center text-amber-500 mb-0.5">
                      <Activity className="w-3.5 h-3.5 mr-1" />
                      <span className="text-[10px] font-bold text-slate-500">Risk Level</span>
                    </div>
                    <div className="text-sm font-bold text-amber-600 mt-1">
                      {selectedWell?.risk_level || activeWell.risk_level}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={() => navigate(`/wells/${selectedWell?.id || activeWell.id}`)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0B1527] text-white text-xs font-bold rounded-xl hover:bg-[#1E293B] transition shadow-sm"
                  >
                    <span>View Well Intelligence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => navigate(`/comparison`)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition shadow-sm"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-[#0070F3]" />
                    <span>Compare Offset Wells</span>
                  </button>
                </div>
              </div>

              {/* Nearby Relevant Wells List Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex-1 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                    <Layers className="w-4 h-4 text-[#0070F3]" />
                    <span>Nearby Relevant Wells ({filteredWells.length} found)</span>
                  </div>
                  <button
                    onClick={() => navigate('/wells')}
                    className="text-xs font-bold text-[#0070F3] hover:underline flex items-center gap-0.5"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Scrollable list of offset wells */}
                <div className="divide-y divide-slate-100 overflow-y-auto flex-1 pr-1 mt-1 max-h-[320px]">
                  {filteredWells.map((well) => (
                    <div
                      key={well.id}
                      onClick={() => setSelectedWell(well)}
                      className={`py-3 px-2 rounded-xl transition cursor-pointer flex flex-col gap-1.5 ${
                        selectedWell?.id === well.id
                          ? 'bg-blue-50/70 border border-blue-200/80 shadow-xs'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              well.risk_level?.includes('High') ? 'bg-[#E11D48]' :
                              well.risk_level?.includes('Medium') ? 'bg-[#F59E0B]' : 'bg-[#0070F3]'
                            }`}
                          ></div>
                          <span className="text-sm font-bold text-[#0B1527]">{well.well_name}</span>
                          <span className="text-xs font-semibold text-slate-500 font-mono">
                            {(well.distance_meters / 1000).toFixed(1)} km
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {well.status}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              well.risk_level?.includes('High')
                                ? 'bg-red-100 text-red-700'
                                : well.risk_level?.includes('Medium')
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {well.risk_level}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span>Formation: <strong className="text-slate-700 font-semibold">{well.formation}</strong></span>
                        <span>|</span>
                        <span>Events: <strong className="text-slate-700 font-semibold">{well.event_count}</strong></span>
                      </div>

                      {well.relevance_reason && (
                        <div className="text-[10px] text-slate-500 bg-slate-100/70 rounded-md px-2 py-1 italic">
                          <strong className="text-slate-700 not-italic font-semibold">Why relevant?</strong> {well.relevance_reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row Summary Cards & Event Severity Donut */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
            {/* Card 1: Nearby Wells */}
            <div
              onClick={() => navigate('/nearby-wells')}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex items-center justify-between hover:border-slate-300 transition cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0070F3]">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-[#0B1527] tracking-tight font-mono">12</div>
                  <div className="text-xs font-bold text-slate-700">Nearby Wells</div>
                  <div className="text-[10px] text-slate-400 font-medium">within 10 km radius</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            {/* Card 2: Historical Events */}
            <div
              onClick={() => navigate('/events')}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex items-center justify-between hover:border-slate-300 transition cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-[#0B1527] tracking-tight font-mono">28</div>
                  <div className="text-xs font-bold text-slate-700">Historical Events</div>
                  <div className="text-[10px] text-slate-400 font-medium">in nearby wells</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            {/* Card 3: Relevant Documents */}
            <div
              onClick={() => navigate('/knowledge')}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex items-center justify-between hover:border-slate-300 transition cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-[#0B1527] tracking-tight font-mono">5</div>
                  <div className="text-xs font-bold text-slate-700">Relevant Documents</div>
                  <div className="text-[10px] text-slate-400 font-medium">well reports and DDRs</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            {/* Card 4: Event Severity (Nearby Wells) Donut */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex items-center gap-4">
              {/* Donut Visual */}
              <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F1F5F9" strokeWidth="4" />
                  {/* High (32%) Red */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#E11D48" strokeWidth="4" strokeDasharray="28 72" strokeDashoffset="0" />
                  {/* Med (39%) Orange */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray="34 66" strokeDashoffset="-28" />
                  {/* Low (21%) Blue/Grey */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#64748B" strokeWidth="4" strokeDasharray="18 82" strokeDashoffset="-62" />
                  {/* Others (7%) */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#94A3B8" strokeWidth="4" strokeDasharray="8 92" strokeDashoffset="-80" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-black text-[#0B1527] leading-none">28</span>
                  <span className="text-[7px] text-slate-400 font-bold uppercase">Events</span>
                </div>
              </div>

              {/* Legend Breakdown */}
              <div className="flex-1 space-y-1 text-[10px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#E11D48]"></div>
                    <span className="text-slate-600 font-medium">High Severity</span>
                  </div>
                  <span className="font-bold text-slate-800">9 <span className="text-slate-400">(32%)</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>
                    <span className="text-slate-600 font-medium">Medium Severity</span>
                  </div>
                  <span className="font-bold text-slate-800">11 <span className="text-slate-400">(39%)</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#64748B]"></div>
                    <span className="text-slate-600 font-medium">Low Severity</span>
                  </div>
                  <span className="font-bold text-slate-800">6 <span className="text-slate-400">(21%)</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#94A3B8]"></div>
                    <span className="text-slate-600 font-medium">Others</span>
                  </div>
                  <span className="font-bold text-slate-800">2 <span className="text-slate-400">(7%)</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}