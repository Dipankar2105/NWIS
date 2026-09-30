import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { 
  documentsService, 
  wellsService, 
  eventsService,
  extractErrorMessage 
} from '../services/api';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  Plus, 
  X, 
  Eye, 
  Download, 
  MoreVertical, 
  Sparkles, 
  Check, 
  RefreshCw, 
  Layers, 
  Tag, 
  Link2, 
  ChevronRight, 
  File, 
  FileType,
  HardHat,
  Database,
  CheckCheck
} from 'lucide-react';

export default function DocumentManagement() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // State
  const [documents, setDocuments] = useState([]);
  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [wellId, setWellId] = useState('DUL-201');
  const [docType, setDocType] = useState('Daily Drilling Report');
  const [formation, setFormation] = useState('Barail');
  const [eventType, setEventType] = useState('Mud Loss');
  const [docDate, setDocDate] = useState('2026-01-12');
  const [source, setSource] = useState('DDR');
  const [tags, setTags] = useState('mud loss, circulation, LCM, barail, daily report');
  const [description, setDescription] = useState('Daily drilling report for DUL-201 covering mud loss event at 3,240 m with LCM treatment.');
  const [enableIndexing, setEnableIndexing] = useState(true);

  // Evidence links
  const [linkedWells, setLinkedWells] = useState(['DUL-201']);
  const [linkedEvents, setLinkedEvents] = useState(['Mud Loss (3,240 m)', 'High Torque (3,500 m)']);
  const [linkedNearbyWells, setLinkedNearbyWells] = useState(['DUL-205', 'DUL-198']);

  // Uploading / Processing Pipeline State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(3); // 1 to 5

  // Load Real Documents & Wells
  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [docsRes, wellsRes] = await Promise.all([
        documentsService.getAll(),
        wellsService.getAll()
      ]);

      const docList = Array.isArray(docsRes) ? docsRes : [];
      setDocuments(docList);

      const wellList = Array.isArray(wellsRes) ? wellsRes : (wellsRes?.wells || []);
      setWells(wellList);
      if (wellList.length > 0) {
        setWellId(wellList[0].well_name || wellList[0].id);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Handle file select
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Form Submit / Upload to Real Backend
  const handleStartProcessing = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a document file to upload.');
      return;
    }

    setIsUploading(true);
    setPipelineStage(1);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('well_id', wellId);
      formData.append('document_type', docType);
      formData.append('force_ocr', 'false');

      setPipelineStage(2);
      const res = await documentsService.upload(formData);
      setPipelineStage(4);

      setTimeout(() => {
        setPipelineStage(5);
        setUploadSuccess(true);
        setIsUploading(false);
        fetchInitialData();
      }, 1200);
    } catch (err) {
      console.error('Error uploading document:', err);
      alert(extractErrorMessage(err));
      setIsUploading(false);
    }
  };

  // Recent Uploads Filter
  const filteredDocuments = documents.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const fn = (d.file_name || '').toLowerCase();
    const wid = (d.well_id || '').toLowerCase();
    const st = (d.processing_status || '').toLowerCase();
    return fn.includes(q) || wid.includes(q) || st.includes(q);
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <Header 
          title="Upload & Process Document" 
          subtitle="Add drilling reports, mud logs and well documents to the NWIS knowledge repository"
          breadcrumb={[
            { label: 'Knowledge', link: '/knowledge' },
            { label: 'Documents', link: '/documents' },
            { label: 'Upload' }
          ]}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto space-y-5">
          
          {/* Success Banner */}
          {uploadSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-semibold">Document uploaded, vectorized, and indexed into NWIS knowledge repository!</span>
              </div>
              <button onClick={() => setUploadSuccess(false)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">✕</button>
            </div>
          )}

          {/* Main 2-Column Workflow Layout matching Upload process document.png */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* ========================================================================= */}
            {/* LEFT COLUMN: MULTI-STEP UPLOAD & METADATA FORM (8 Cols) */}
            {/* ========================================================================= */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* STEP 1: Upload Document Card */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white text-[11px] font-bold flex items-center justify-center">
                    1
                  </span>
                  <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Upload Document
                  </h2>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-[#FAFCFF] rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="w-12 h-12 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                    <UploadCloud className="w-6 h-6 text-blue-600" />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Drag and drop files here
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">or</p>
                  </div>

                  <button
                    type="button"
                    className="px-4 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                  >
                    Browse Files
                  </button>

                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    Supported formats: <strong className="text-slate-700">PDF, DOC, DOCX</strong> | Max file size: <strong className="text-slate-700">50 MB</strong>
                  </p>
                  <p className="text-[9px] text-slate-400">
                    Typical documents: Daily Drilling Reports (DDR), Mud Logs, Well Reports, Completion Reports, PDF Scans
                  </p>
                </div>

                {/* Selected File Preview */}
                {selectedFile && (
                  <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 flex items-center justify-between text-xs animate-fade-in">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <div>
                        <span className="font-bold text-slate-900">{selectedFile.name}</span>
                        <span className="text-[10px] text-slate-500 ml-2">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      className="text-slate-400 hover:text-red-600 font-bold p-1"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* STEP 2: Document Metadata Card */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white text-[11px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Document Metadata
                  </h2>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Well ID */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Well ID <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={wellId}
                      onChange={(e) => setWellId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {wells.map(w => {
                        const name = w.well_name || w.id;
                        return <option key={name} value={name}>{name}</option>;
                      })}
                      {wells.length === 0 && (
                        <>
                          <option value="DUL-201">DUL-201</option>
                          <option value="DUL-235">DUL-235</option>
                          <option value="DUL-198">DUL-198</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Document Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Document Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Daily Drilling Report">Daily Drilling Report</option>
                      <option value="Mud Log">Mud Log</option>
                      <option value="Well Report">Well Report</option>
                      <option value="Completion Report">Completion Report</option>
                      <option value="Casing & Cementing Report">Casing & Cementing Report</option>
                      <option value="Geological Report">Geological Report</option>
                    </select>
                  </div>

                  {/* Formation */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Formation
                    </label>
                    <select
                      value={formation}
                      onChange={(e) => setFormation(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Barail">Barail</option>
                      <option value="Tipam">Tipam</option>
                      <option value="Girujan">Girujan</option>
                      <option value="Dihing">Dihing</option>
                      <option value="Kopili">Kopili</option>
                      <option value="Alluvium">Alluvium</option>
                    </select>
                  </div>

                  {/* Event Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Event Type
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Mud Loss">Mud Loss</option>
                      <option value="High Torque">High Torque</option>
                      <option value="Kick">Kick</option>
                      <option value="Stuck Pipe">Stuck Pipe</option>
                      <option value="Tight Hole">Tight Hole</option>
                      <option value="Normal Operations">Normal Operations</option>
                    </select>
                  </div>

                  {/* Document Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Document Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Source */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Source
                    </label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="DDR">DDR</option>
                      <option value="Daily Mud Log">Daily Mud Log</option>
                      <option value="Geology Dept">Geology Dept</option>
                      <option value="Contractor Log">Contractor Log</option>
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. mud loss, circulation, LCM, barail, daily report"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief summary of document contents and key operational events..."
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* STEP 3: Evidence Linking Card */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white text-[11px] font-bold flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      Evidence Linking
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      Link this document to relevant wells, events and formations for better retrieval
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {/* Link to Wells */}
                  <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block">Link to Well(s)</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {linkedWells.map(w => (
                        <span key={w} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md flex items-center gap-1">
                          {w} <button type="button" onClick={() => setLinkedWells(linkedWells.filter(x => x !== w))}>✕</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Link to Events */}
                  <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block">Link to Event(s)</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {linkedEvents.map(ev => (
                        <span key={ev} className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md flex items-center gap-1">
                          {ev} <button type="button" onClick={() => setLinkedEvents(linkedEvents.filter(x => x !== ev))}>✕</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Link to Nearby Wells */}
                  <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block">Link to Nearby Well(s)</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {linkedNearbyWells.map(nw => (
                        <span key={nw} className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md flex items-center gap-1">
                          {nw} <button type="button" onClick={() => setLinkedNearbyWells(linkedNearbyWells.filter(x => x !== nw))}>✕</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 4: Index for NWIS AI & Action Buttons */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    4
                  </span>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableIndexing}
                        onChange={(e) => setEnableIndexing(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-extrabold text-slate-900">
                        Enable indexing for NWIS AI (recommended)
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Make this document searchable and available to NWIS AI for question answering, insights and evidence retrieval.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleStartProcessing}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#DC2626] hover:bg-red-700 text-white rounded-lg text-xs font-extrabold transition-all shadow-xs disabled:opacity-50"
                  >
                    {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    {isUploading ? 'Processing...' : 'Start Processing'}
                  </button>

                  <button
                    type="button"
                    onClick={() => alert('Draft saved.')}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-xs"
                  >
                    Save Draft
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>

            </div>

            {/* ========================================================================= */}
            {/* RIGHT COLUMN: PROCESSING PIPELINE & EXTRACTED PREVIEW (4 Cols) */}
            {/* ========================================================================= */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Processing Pipeline Card matching Upload process document.png */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Layers className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Processing Pipeline
                  </h3>
                </div>

                {/* Pipeline Steps */}
                <div className="space-y-3.5">
                  {[
                    { num: 1, title: 'Upload File', desc: 'File received and stored securely', status: pipelineStage >= 1 ? 'completed' : 'pending', time: '12 Jan 2026, 10:42' },
                    { num: 2, title: 'Validate & Scan', desc: 'Check file format, size and security', status: pipelineStage >= 2 ? 'completed' : 'pending', time: '12 Jan 2026, 10:42' },
                    { num: 3, title: 'Extract Text', desc: 'Extract text from PDF/DOCX', status: pipelineStage === 3 ? 'processing' : pipelineStage > 3 ? 'completed' : 'pending', time: '12 Jan 2026, 10:43' },
                    { num: 4, title: 'Index Document', desc: 'Create embeddings and index', status: pipelineStage === 4 ? 'processing' : pipelineStage > 4 ? 'completed' : 'pending' },
                    { num: 5, title: 'Link Evidence', desc: 'Link to wells, events and formations', status: pipelineStage >= 5 ? 'completed' : 'pending' },
                  ].map((step) => (
                    <div key={step.num} className="flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                          step.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : step.status === 'processing'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {step.status === 'completed' ? '✓' : step.num}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {step.num}. {step.title}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{step.desc}</p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {step.status === 'completed' && (
                          <span className="text-[10px] font-bold text-emerald-600 block">
                            Completed
                          </span>
                        )}
                        {step.status === 'processing' && (
                          <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            Processing...
                          </span>
                        )}
                        {step.status === 'pending' && (
                          <span className="text-[10px] text-slate-400 block">Pending</span>
                        )}
                        {step.time && (
                          <span className="text-[9px] text-slate-400 block">{step.time}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extracted Preview Card */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      Extracted Preview
                    </h3>
                  </div>
                  <button 
                    onClick={() => navigate('/knowledge')}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View Full Text <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Text excerpt */}
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-slate-200/70 text-[11px] text-slate-600 italic leading-relaxed">
                  “... At 3,240 m in Barail formation, significant mud loss was observed. Losses estimated at 60–80 bbl/hr. LCM pills (MICA + Calcium Carbonate) were pumped in 2 stages. Circulation partially regained after 3 hours. Further losses observed at 3,260 m but reduced to 10–15 bbl/hr ...”
                </div>

                {/* Detected Key Entities */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Detected Key Entities
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold">
                      ● Mud Loss
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded text-[10px] font-bold">
                      Barail Formation
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                      3,240 m
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                      LCM Treatment
                    </span>
                  </div>
                </div>

                {/* Document Summary (Auto-generated) */}
                <div className="p-3 bg-blue-50/40 rounded-lg border border-blue-100 space-y-1">
                  <span className="text-[10px] font-bold text-blue-900 block flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    Document Summary (Auto-generated)
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    This document reports a mud loss event at 3,240 m in the Barail formation for well DUL-201. Losses of 60–80 bbl/hr were recorded. LCM treatment was applied, and circulation partially regained.
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* ========================================================================= */}
          {/* BOTTOM SECTION: RECENT UPLOADS TABLE matching Upload process document.png */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                  Recent Uploads
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {/* Search in Uploads */}
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search uploaded documents..."
                    className="w-full pl-8 pr-3 py-1 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <Link
                  to="/knowledge"
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 whitespace-nowrap"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">File Name</th>
                    <th className="pb-2">Well ID</th>
                    <th className="pb-2">Document Type</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Formation</th>
                    <th className="pb-2">Size</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Indexing</th>
                    <th className="pb-2">Linked To</th>
                    <th className="pb-2">Uploaded By</th>
                    <th className="pb-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {/* Real documents from backend if present */}
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.document_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-red-100 text-red-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0">PDF</span>
                        <span className="truncate max-w-[200px]">{doc.file_name || 'document.pdf'}</span>
                      </td>
                      <td className="py-2.5 text-blue-600 font-semibold">{doc.well_id || 'DUL-201'}</td>
                      <td className="py-2.5 text-slate-700">{doc.document_type || 'Daily Drilling Report'}</td>
                      <td className="py-2.5 text-slate-500">{new Date(doc.processed_at || Date.now()).toLocaleDateString('en-GB')}</td>
                      <td className="py-2.5 text-slate-700 font-medium">Barail</td>
                      <td className="py-2.5 text-slate-500">4.2 MB</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {doc.processing_status || 'Indexed'}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className="flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500">2 events, 2 wells</td>
                      <td className="py-2.5 text-slate-600">Drilling Engineer</td>
                      <td className="py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                          <button title="View Document" className="hover:text-blue-600"><Eye className="w-3.5 h-3.5" /></button>
                          <button title="Download" className="hover:text-slate-700"><Download className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Seed / Baseline items matching Upload process document.png */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-red-100 text-red-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0">PDF</span>
                      <span>DUL-201_Daily_Drilling_Report.pdf</span>
                    </td>
                    <td className="py-2.5 text-blue-600 font-semibold"><Link to="/wells/DUL-201">DUL-201</Link></td>
                    <td className="py-2.5 text-slate-700">Daily Drilling Report</td>
                    <td className="py-2.5 text-slate-500">12 Jan 2026</td>
                    <td className="py-2.5 text-slate-700 font-medium">Barail</td>
                    <td className="py-2.5 text-slate-500">4.2 MB</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Processing
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-1 text-blue-600 font-bold text-[10px]">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" /> In Progress
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500">2 events, 2 wells</td>
                    <td className="py-2.5 text-slate-600">Drilling Engineer</td>
                    <td className="py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <button title="View" className="hover:text-blue-600"><Eye className="w-3.5 h-3.5" /></button>
                        <button title="Download" className="hover:text-slate-700"><Download className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-red-100 text-red-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0">PDF</span>
                      <span>DUL-201_Mud_Log.pdf</span>
                    </td>
                    <td className="py-2.5 text-blue-600 font-semibold"><Link to="/wells/DUL-201">DUL-201</Link></td>
                    <td className="py-2.5 text-slate-700">Mud Log</td>
                    <td className="py-2.5 text-slate-500">08 Feb 2026</td>
                    <td className="py-2.5 text-slate-700 font-medium">Barail</td>
                    <td className="py-2.5 text-slate-500">3.6 MB</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Indexed
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500">1 event, 1 well</td>
                    <td className="py-2.5 text-slate-600">Drilling Engineer</td>
                    <td className="py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <button title="View" className="hover:text-blue-600"><Eye className="w-3.5 h-3.5" /></button>
                        <button title="Download" className="hover:text-slate-700"><Download className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0">DOC</span>
                      <span>DUL-205_Daily_Drilling_Report.docx</span>
                    </td>
                    <td className="py-2.5 text-blue-600 font-semibold"><Link to="/wells/DUL-205">DUL-205</Link></td>
                    <td className="py-2.5 text-slate-700">Daily Drilling Report</td>
                    <td className="py-2.5 text-slate-500">25 Sept 2026</td>
                    <td className="py-2.5 text-slate-700 font-medium">Barail</td>
                    <td className="py-2.5 text-slate-500">4.8 MB</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Needs Review
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-1 text-slate-400 font-bold text-[10px]">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500">1 event, 3 wells</td>
                    <td className="py-2.5 text-slate-600">Drilling Engineer</td>
                    <td className="py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <button title="View" className="hover:text-blue-600"><Eye className="w-3.5 h-3.5" /></button>
                        <button title="Download" className="hover:text-slate-700"><Download className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-red-100 text-red-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0">PDF</span>
                      <span>DUL-198_Well_Report.pdf</span>
                    </td>
                    <td className="py-2.5 text-blue-600 font-semibold"><Link to="/wells/DUL-198">DUL-198</Link></td>
                    <td className="py-2.5 text-slate-700">Well Report</td>
                    <td className="py-2.5 text-slate-500">21 Jan 2026</td>
                    <td className="py-2.5 text-slate-700 font-medium">Tipam</td>
                    <td className="py-2.5 text-slate-500">5.1 MB</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Indexed
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500">2 events, 2 wells</td>
                    <td className="py-2.5 text-slate-600">Drilling Engineer</td>
                    <td className="py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <button title="View" className="hover:text-blue-600"><Eye className="w-3.5 h-3.5" /></button>
                        <button title="Download" className="hover:text-slate-700"><Download className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-red-100 text-red-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0">PDF</span>
                      <span>DUL-201_Completion_Report.pdf</span>
                    </td>
                    <td className="py-2.5 text-blue-600 font-semibold"><Link to="/wells/DUL-201">DUL-201</Link></td>
                    <td className="py-2.5 text-slate-700">Completion Report</td>
                    <td className="py-2.5 text-slate-500">05 Sept 2026</td>
                    <td className="py-2.5 text-slate-700 font-medium">Barail</td>
                    <td className="py-2.5 text-slate-500">6.2 MB</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Indexed
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500">1 event, 1 well</td>
                    <td className="py-2.5 text-slate-600">Drilling Engineer</td>
                    <td className="py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <button title="View" className="hover:text-blue-600"><Eye className="w-3.5 h-3.5" /></button>
                        <button title="Download" className="hover:text-slate-700"><Download className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </main>
      </div>
  );
}
