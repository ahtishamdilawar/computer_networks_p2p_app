import "./App.css";
import "./src/index.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Upload, File, Check, X, Download } from "lucide-react";
const CustomButton = (props) => (
  <Button {...props} className={`bg-red-500 hover:bg-red-600 text-white ${props.className || ""}`}>
    {props.children}
  </Button>
);
const ChatBox = ({
    peerId,
    connections,
    fileTransfers,
    sendMessage,
    handleFileChange,
    downloadFile,
  }) => (
    <div className="peer-window border-2 rounded-lg p-4">
      <h2 className="text-xl font-bold ml-3">
        Chat with <Badge variant="secondary"><span style={{ fontSize: '20px' }}>{peerId}</span></Badge>
      </h2>
      <ScrollArea style={{ maxHeight: "400px" }}>
        {connections.get(peerId).map((msg, idx) => (
          <div key={idx} className="p-2 rounded-lg">
            <strong>{msg.sender}:</strong> {msg.text}
          </div>
        ))}
      </ScrollArea>
      <ReceivedFiles peerId={peerId} fileTransfers={fileTransfers} downloadFile={downloadFile} />
      <MessageInput peerId={peerId} sendMessage={sendMessage} handleFileChange={handleFileChange} />
    </div>
  );
 

  