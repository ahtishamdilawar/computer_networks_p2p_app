
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Upload, File, Check, X, Download } from "lucide-react";
const PeerList = ({ connectedPeers, connectToPeer }) => (
    <Tabs>
      <TabsList>
      <TabsList>
  <TabsTrigger value="peers" >Peers</TabsTrigger>
</TabsList>
</TabsList>

      <TabsContent value="peers">
        <ScrollArea>
          {connectedPeers.map((peer) => (
            <div key={peer.peerId} className="flex justify-end space-x-2 mb-2">
              <Badge>{peer.peerId}</Badge>
              <Button
  variant="outline"
  size="sm"
  onClick={() => connectToPeer(peer.peerId)}
  className="text-red-500 bg-blue-500 hover:bg-blue-600 border-blue-700"
>
  Connect
</Button>

            </div>
          ))}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
  