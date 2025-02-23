import { Users } from "lucide-react";

const SidebarSkeleton = () => {
  const skeletonContacts = Array(8).fill(null);

  return (
    <aside className="h-full w-full lg:w-[30%] border-r border-base-300 flex flex-col">
      <div className="border-b border-base-300 w-full p-2 lg:p-5">
        <div className="flex items-center gap-1 lg:gap-2">
          <Users className="w-4 h-4 lg:w-6 lg:h-6" />
          <span className="font-medium hidden lg:block text-sm">Contacts</span>
        </div>
      </div>
      <div className="overflow-y-auto w-full py-1 lg:py-3">
        {skeletonContacts.map((_, idx) => (
          <div key={idx} className="w-full p-1 lg:p-3 flex items-center gap-2">
            <div className="skeleton size-8 lg:size-12 rounded-full" />
            <div className="hidden lg:block text-left min-w-0 flex-1">
              <div className="skeleton h-3 lg:h-4 w-24 lg:w-32 mb-1 lg:mb-2" />
              <div className="skeleton h-2 lg:h-3 w-12 lg:w-16" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;
