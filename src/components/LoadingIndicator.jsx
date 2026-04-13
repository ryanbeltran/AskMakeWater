import WaterDrop from './WaterDrop';

export default function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-mw-water-light flex items-center justify-center">
          <WaterDrop size={12} className="text-mw-water animate-droplet" />
        </div>
        <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-mw-water/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-mw-water/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-mw-water/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
