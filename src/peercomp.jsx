import React, { useEffect, useState, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Upload, File, Check, X, Download } from "lucide-react";

const colorPalette = [
  'bg-blue-50 border-blue-200',
  'bg-green-50 border-green-200',
  'bg-purple-50 border-purple-200',
  'bg-pink-50 border-pink-200',
  'bg-yellow-50 border-yellow-200',
  'bg-indigo-50 border-indigo-200',
  'bg-teal-50 border-teal-200',
  'bg-red-50 border-red-200',
  'bg-orange-50 border-orange-200',
];

const PeerConnectionManager = () => {
  const [socket, setSocket] = useState(null);
  const [peer, setPeer] = useState(null);
  const [peerId, setPeerId] = useState("");
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [connections, setConnections] = useState(new Map());
  const [pendingConnections, setPendingConnections] = useState(new Map());
  const [status, setStatus] = useState("initializing");
  const [messageInput, setMessageInput] = useState("");
  const [fileTransfers, setFileTransfers] = useState(new Map());
  const [peerColors, setPeerColors] = useState(new Map());
  const fileInputRef = useRef(null);

  // Assign a unique color to each peer
  const assignPeerColor = useCallback((peerId) => {
    if (peerColors.has(peerId)) {
      return peerColors.get(peerId);
    }

    const availableColors = colorPalette.filter(
      color => ![...peerColors.values()].includes(color)
    );

    const selectedColor = availableColors.length > 0 
      ? availableColors[0] 
      : colorPalette[Math.floor(Math.random() * colorPalette.length)];

    setPeerColors((prev) => new Map(prev).set(peerId, selectedColor));
    return selectedColor;
  }, [peerColors]);
  // Initialize Socket.IO and PeerJS
  useEffect(() => {
    const newSocket = io("http://localhost:3000");
    const newPeer = new Peer();
  
    newPeer.on("open", (id) => {
      setPeerId(id);
      setStatus("connected");
      newSocket.emit("register-peer", id);
    });
  
    newPeer.on("connection", (conn) => {
      console.log(`Incoming connection from: ${conn.peer}`);
      
      // Add to pending connections
      setPendingConnections((prev) => {
        const newPending = new Map(prev);
        newPending.set(conn.peer, conn);
        return newPending;
      });
    });
  
    newPeer.on("error", (error) => {
      console.error("PeerJS error:", error);
      setStatus("error");
    });
  
    setSocket(newSocket);
    setPeer(newPeer);
  
    return () => {
      newSocket.close();
      newPeer.destroy();
    };
  }, []);

  // Handle peer list updates
  useEffect(() => {
    if (!socket) return;

    socket.on("peer-list-updated", (peerList) => {
      console.log("Received peer list:", peerList);
      const filteredPeers = peerList.filter((p) => p.peerId !== peerId);
      setConnectedPeers(filteredPeers);
    });

    return () => {
      socket.off("peer-list-updated");
    };
  }, [socket, peerId]);

  // Accept incoming connection
  const acceptConnection = useCallback((sourcePeerId) => {
    const conn = pendingConnections.get(sourcePeerId);
    if (!conn) return;

    // Set up connection event handlers
    conn.on("data", (data) => {
      console.log(`Received data from ${conn.peer}:`, data);
      if (typeof data === "string") {
        setConnections((prev) => {
          const newConnections = new Map(prev);
          if (!newConnections.has(conn.peer)) {
            newConnections.set(conn.peer, []);
          }
          newConnections.get(conn.peer).push({ sender: conn.peer, text: data });
          return newConnections;
        });
      } else if (data && data.fileName && data.fileData) {
        // Handle file transfer
        setFileTransfers((prev) => {
          const newTransfers = new Map(prev);
          if (!newTransfers.has(conn.peer)) {
            newTransfers.set(conn.peer, []);
          }
          newTransfers.get(conn.peer).push({
            fileName: data.fileName,
            fileData: data.fileData,
            receivedAt: new Date()
          });
          return newTransfers;
        });

        // Add file message to chat
        setConnections((prev) => {
          const newConnections = new Map(prev);
          if (!newConnections.has(conn.peer)) {
            newConnections.set(conn.peer, []);
          }
          newConnections.get(conn.peer).push({ 
            sender: conn.peer, 
            text: `Sent a file: ${data.fileName}`,
            type: 'file'
          });
          return newConnections;
        });
      }
    });

    conn.on("close", () => {
      console.log(`Connection with peer ${conn.peer} closed.`);
      setConnections((prev) => {
        const newConnections = new Map(prev);
        newConnections.delete(conn.peer);
        return newConnections;
      });

      setPendingConnections((prev) => {
        const newPending = new Map(prev);
        newPending.delete(conn.peer);
        return newPending;
      });
    });

    // Add to active connections
    setConnections((prev) => new Map(prev.set(sourcePeerId, [])));

    // Remove from pending connections
    setPendingConnections((prev) => {
      const newPending = new Map(prev);
      newPending.delete(sourcePeerId);
      return newPending;
    });
  }, [pendingConnections]);

  // Download received file
  const downloadFile = (peerId, fileIndex) => {
    const fileTransfer = fileTransfers.get(peerId)[fileIndex];
    const blob = new Blob([fileTransfer.fileData], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileTransfer.fileName;
    link.click();
  };

  // Reject incoming connection
  const rejectConnection = useCallback((sourcePeerId) => {
    const conn = pendingConnections.get(sourcePeerId);
    if (conn) {
      conn.close();
    }

    setPendingConnections((prev) => {
      const newPending = new Map(prev);
      newPending.delete(sourcePeerId);
      return newPending;
    });
  }, [pendingConnections]);

  // Connect to another peer
  const connectToPeer = useCallback(
    (targetPeerId) => {
      if (!peer || connections.has(targetPeerId)) {
        console.log("Already connected or PeerJS not initialized.");
        return;
      }
  
      const conn = peer.connect(targetPeerId);
      conn.on("open", () => {
        console.log(`Connected to peer: ${targetPeerId}`);
        setConnections((prev) => new Map(prev.set(targetPeerId, [])));
      });
  
      conn.on("data", (data) => {
        console.log(`Received data from ${targetPeerId}:`, data);
        if (typeof data === "string") {
          setConnections((prev) => {
            const newConnections = new Map(prev);
            if (!newConnections.has(targetPeerId)) {
              newConnections.set(targetPeerId, []);
            }
            newConnections.get(targetPeerId).push({ sender: targetPeerId, text: data });
            return newConnections;
          });
        } else if (data && data.fileName && data.fileData) {
          // Handle file transfer
          setFileTransfers((prev) => {
            const newTransfers = new Map(prev);
            if (!newTransfers.has(targetPeerId)) {
              newTransfers.set(targetPeerId, []);
            }
            newTransfers.get(targetPeerId).push({
              fileName: data.fileName,
              fileData: data.fileData,
              receivedAt: new Date()
            });
            return newTransfers;
          });

          // Add file message to chat
          setConnections((prev) => {
            const newConnections = new Map(prev);
            if (!newConnections.has(targetPeerId)) {
              newConnections.set(targetPeerId, []);
            }
            newConnections.get(targetPeerId).push({ 
              sender: targetPeerId, 
              text: `Sent a file: ${data.fileName}`,
              type: 'file'
            });
            return newConnections;
          });
        }
      });
  
      conn.on("error", (error) => {
        console.error("Connection error:", error);
      });
  
      conn.on("close", () => {
        console.log(`Connection to peer ${targetPeerId} closed.`);
        setConnections((prev) => {
          const newMap = new Map(prev);
          newMap.delete(targetPeerId);
          return newMap;
        });
      });
    },
    [peer, connections]
  );

  // Send message
  const sendMessage = (peerId) => {
    if (!peerId || !connections.has(peerId) || !messageInput.trim())
      return;

    const conn = peer.connections[peerId][0]; // Assuming one connection per peer
    conn.send(messageInput);
    setConnections((prev) => {
      const newConnections = new Map(prev);
      newConnections.get(peerId).push({ sender: "me", text: messageInput });
      return newConnections;
    });
    setMessageInput("");
  };

  // Handle file input change
  const handleFileChange = (event, peerId) => {
    const file = event.target.files[0];
    if (!file || !peerId || !connections.has(peerId)) return;

    const conn = peer.connections[peerId][0]; // Assuming one connection per peer
    const reader = new FileReader();
    reader.onload = () => {
      conn.send({ fileName: file.name, fileData: reader.result });
      
      // Add file message to chat
      setConnections((prev) => {
        const newConnections = new Map(prev);
        newConnections.get(peerId).push({ 
          sender: "me", 
          text: `Sent a file: ${file.name}`,
          type: 'file'
        });
        return newConnections;
      });
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Peer-to-Peer Communication</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Pending Connections Section */}
          {pendingConnections.size > 0 && (
            <div className="mb-4 bg-gray-50 p-3 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Pending Connections</h3>
              {Array.from(pendingConnections.keys()).map((peerId) => (
                <div key={peerId} className="flex items-center space-x-2 mb-2">
                  <Badge>{peerId}</Badge>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => acceptConnection(peerId)}
                  >
                    <Check className="mr-2 h-4 w-4" /> Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => rejectConnection(peerId)}
                  >
                    <X className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Tabs>
            <TabsList>
              <TabsTrigger value="peers">Peers</TabsTrigger>
            </TabsList>
            <TabsContent value="peers">
              <ScrollArea>
                {connectedPeers.map((p) => (
                  <div key={p.peerId} className="flex items-center space-x-2 mb-2">
                    <Badge>{p.peerId}</Badge>
                    <Button
                      onClick={() => connectToPeer(p.peerId)}
                      variant="outline"
                      size="sm"
                    >
                      Connect
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>
          </Tabs>
          
          {/* Chat Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(connections.keys()).map((peerId) => {
              const peerColor = assignPeerColor(peerId);
              return (
                <div 
                  key={peerId} 
                  className={`peer-window border-2 rounded-lg p-4 ${peerColor} transition-all duration-300 hover:shadow-md`}
                >
                  <h2 className="text-xl font-bold mb-3 flex items-center">
                    <span className="mr-2">Chat with</span>
                    <Badge variant="secondary">{peerId}</Badge>
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Chat Messages */}
                    <ScrollArea className="border rounded-lg p-2" style={{ maxHeight: "400px" }}>
                      <div className="space-y-2">
                        {connections.get(peerId).map((msg, idx) => (
                          <div 
                            key={idx} 
                            className={`p-2 rounded-lg ${
                              msg.sender === 'me' 
                                ? 'bg-blue-100 text-right' 
                                : 'bg-gray-100 text-left'
                            }`}
                          >
                            <strong className="block mb-1">{msg.sender}:</strong>
                            {msg.type === 'file' ? (
                              <span className="text-blue-600">{msg.text}</span>
                            ) : (
                              <span>{msg.text}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Received Files */}
                    <div className="border rounded-lg p-2">
                      <h3 className="font-bold mb-2 text-center">Received Files</h3>
                      {fileTransfers.get(peerId) ? (
                        <ScrollArea style={{ maxHeight: "400px" }}>
                          {fileTransfers.get(peerId).map((file, index) => (
                            <div 
                              key={index} 
                              className="flex items-center justify-between mb-2 p-2 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center">
                                <File className="mr-2 h-5 w-5 text-blue-500" />
                                <span>{file.fileName}</span>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => downloadFile(peerId, index)}
                              >
                                <Download className="mr-2 h-4 w-4" /> Download
                              </Button>
                            </div>
                          ))}
                        </ScrollArea>
                      ) : (
                        <p className="text-gray-500 text-center">No files received</p>
                      )}
                    </div>
                  </div>

                  {/* Message Input Area */}
                  <div className="mt-4 flex space-x-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message"
                      className="flex-grow"
                    />
                    <Button onClick={() => sendMessage(peerId)} className="px-4">
                      <Send className="mr-2 h-4 w-4" /> Send
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current.click()}
                      className="px-4"
                    >
                      <Upload className="mr-2 h-4 w-4" /> File
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      onChange={(e) => handleFileChange(e, peerId)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PeerConnectionManager;