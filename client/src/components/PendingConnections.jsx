
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Upload, File, Check, X, Download } from "lucide-react";
const PendingConnections = ({ pendingConnections, acceptConnection, rejectConnection }) => (
    <div>
      {pendingConnections.size > 0 && (
        <div className="mb-4 bg-gray-50 p-3 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Pending Connections</h3>
          {Array.from(pendingConnections.keys()).map((peerId) => (
            <div key={peerId} className="flex items-center space-x-2 mb-2">
              <Badge>{peerId}</Badge>
              <Button size="sm" variant="outline" onClick={() => acceptConnection(peerId)}>
                Accept
              </Button>
              <Button size="sm" variant="destructive" onClick={() => rejectConnection(peerId)}>
                Reject
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  