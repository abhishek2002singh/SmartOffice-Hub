import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useNavigate }   from 'react-router-dom';
import { useDispatch }   from 'react-redux';
import { changeStage }   from '../../../store/leadsSlice';
import LeadScoreBadge    from './LeadScoreBadge';
import StaleIndicator    from './StaleIndicator';
import { Phone, Building2 } from 'lucide-react';

const STAGES = ['new', 'assigned', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

const STAGE_CONFIG = {
  new:         { label: 'New',         color: 'border-gray-600',   header: 'bg-gray-700' },
  assigned:    { label: 'Assigned',    color: 'border-blue-700',   header: 'bg-blue-800/60' },
  contacted:   { label: 'Contacted',   color: 'border-indigo-700', header: 'bg-indigo-800/60' },
  qualified:   { label: 'Qualified',   color: 'border-cyan-700',   header: 'bg-cyan-800/60' },
  proposal:    { label: 'Proposal',    color: 'border-purple-700', header: 'bg-purple-800/60' },
  negotiation: { label: 'Negotiation', color: 'border-yellow-700', header: 'bg-yellow-800/60' },
  won:         { label: 'Won',         color: 'border-green-700',  header: 'bg-green-800/60' },
  lost:        { label: 'Lost',        color: 'border-red-800',    header: 'bg-red-900/60' },
};

const PRIORITY_DOT = { high: 'bg-red-500', medium: 'bg-yellow-500', low: 'bg-gray-500' };

function LeadCard({ lead, index }) {
  const navigate = useNavigate();
  return (
    <Draggable draggableId={lead._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => navigate(`/crm/leads/${lead._id}`)}
          className={`bg-[#0A1628] border rounded-lg p-3 cursor-pointer transition-shadow text-sm select-none
            ${snapshot.isDragging ? 'border-[#1E6FD9] shadow-lg shadow-blue-900/30 rotate-1' : 'border-[#1A3A6B] hover:border-[#1E6FD9]/50'}`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-white font-medium leading-tight line-clamp-1">{lead.name}</p>
            <div className="flex items-center gap-1 shrink-0">
              <StaleIndicator lead={lead} size={11} />
              <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[lead.priority] || 'bg-gray-500'}`} title={lead.priority} />
            </div>
          </div>

          {lead.company && (
            <p className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <Building2 size={10} /> {lead.company}
            </p>
          )}
          <p className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <Phone size={10} /> {lead.mobile}
          </p>

          <div className="flex items-center justify-between">
            <LeadScoreBadge score={lead.leadScore} />
            {lead.source?.name && (
              <span className="text-xs text-gray-600 truncate max-w-[80px]">{lead.source.name}</span>
            )}
          </div>

          {lead.assignedTo && (
            <p className="text-xs text-gray-600 mt-1.5 truncate">{lead.assignedTo.name}</p>
          )}
        </div>
      )}
    </Draggable>
  );
}

function KanbanColumn({ stage, leads }) {
  const cfg = STAGE_CONFIG[stage] || { label: stage, color: 'border-gray-700', header: 'bg-gray-800' };
  return (
    <div className={`flex flex-col min-w-[220px] max-w-[240px] rounded-xl border ${cfg.color} overflow-hidden`}>
      <div className={`flex items-center justify-between px-3 py-2.5 ${cfg.header}`}>
        <span className="text-xs font-semibold text-white uppercase tracking-wider">{cfg.label}</span>
        <span className="text-xs text-gray-400 font-medium">{leads.length}</span>
      </div>
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 space-y-2 min-h-[200px] transition-colors ${snapshot.isDraggingOver ? 'bg-[#1A3A6B]/20' : 'bg-[#0A1628]/50'}`}
          >
            {leads.map((lead, idx) => (
              <LeadCard key={lead._id} lead={lead} index={idx} />
            ))}
            {provided.placeholder}
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-center text-xs text-gray-700 py-4">Drop here</p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function KanbanBoard({ leads, onStageChange }) {
  const dispatch = useDispatch();

  const grouped = STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage);
    return acc;
  }, {});

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStage = destination.droppableId;
    dispatch(changeStage({ id: draggableId, data: { stage: newStage } }))
      .then(() => onStageChange?.());
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <KanbanColumn key={stage} stage={stage} leads={grouped[stage] || []} />
        ))}
      </div>
    </DragDropContext>
  );
}
