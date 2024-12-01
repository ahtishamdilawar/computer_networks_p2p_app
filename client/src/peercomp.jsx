import React, { useEffect, useState, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Upload, File, Check, X, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";


const colorPalette = [
  "bg-blue-50 border-blue-200",
  "bg-green-50 border-green-200",
  "bg-purple-50 border-purple-200",
  "bg-pink-50 border-pink-200",
  "bg-yellow-50 border-yellow-200",
  "bg-indigo-50 border-indigo-200",
  "bg-teal-50 border-teal-200",
  "bg-red-50 border-red-200",
  "bg-orange-50 border-orange-200",
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
  const [groups, setGroups] = useState(new Map());
  const [groupMessages, setGroupMessages] = useState(new Map());
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([])
  const [nickname, setNickname] = useState("");
  const [peerNicknames, setPeerNicknames] = useState(new Map());
  const [isNicknameSet, setIsNicknameSet] = useState(false);
  // Assign a unique color to each peer
  const assignPeerColor = useCallback(
    (peerId) => {
      if (peerColors.has(peerId)) {
        return peerColors.get(peerId);
      }

      const availableColors = colorPalette.filter(
        (color) => ![...peerColors.values()].includes(color)
      );

      const selectedColor =
        availableColors.length > 0
          ? availableColors[0]
          : colorPalette[Math.floor(Math.random() * colorPalette.length)];

      setPeerColors((prev) => new Map(prev).set(peerId, selectedColor));
      return selectedColor;
    },
    [peerColors]
  );
  // Initialize Socket.IO and PeerJS
  useEffect(() => {
    const newSocket = io("http://localhost:3000");
    const newPeer = new Peer();

    newPeer.on("open", (id="123") => {
      setPeerId(id);
      setStatus("connected");
      // Don't register until nickname is set
    });
    // Add nickname update listener
    newSocket.on("nickname-updated", ({ peerId, nickname }) => {
      setPeerNicknames(prev => new Map(prev).set(peerId, nickname));
    });
    
     // Listen for group-related events
     newSocket.on("group-created", (groupData) => {
      setGroups((prev) => new Map(prev.set(groupData.id, groupData)));
      setGroupMessages((prev) => new Map(prev.set(groupData.id, [])));
    });
    newSocket.on("group-message", ({ groupId, message, sender }) => {
      setGroupMessages((prev) => {
        const newMessages = new Map(prev);
        if (!newMessages.has(groupId)) {
          newMessages.set(groupId, []);
        }
        newMessages.get(groupId).push({ sender, text: message, timestamp: Date.now() });
        return newMessages;
      });
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
    // Update peer list handler to include nicknames
    newSocket.on("peer-list-updated", (peerList) => {
      console.log("Received peer list:", peerList);
      const filteredPeers = peerList.filter((p) => p.peerId !== peerId);
      setConnectedPeers(filteredPeers);
      
    newPeer.on("error", (error) => {
      console.error("PeerJS error:", error);
      setStatus("error");
    });
    
    
      // Update nicknames
      const newNicknames = new Map();
      peerList.forEach(peer => {
        if (peer.nickname) {
          newNicknames.set(peer.peerId, peer.nickname);
        }
      });
      setPeerNicknames(newNicknames);
    });

    setSocket(newSocket);
    setPeer(newPeer);

    return () => {
      newSocket.close();
      newPeer.destroy();
    };
  }, []);
    // Helper function to get nickname
    const getNickname = (peerId) => {
      return peerNicknames.get(peerId) || peerId;
    };
  // Handle nickname submission
  const submitNickname = () => {
    if (!nickname.trim()) return;
    
    socket.emit("register-peer", {
      peerId,
      nickname: nickname.trim()
    });    
    setIsNicknameSet(true);
  };
 // Create new group
 const createGroup = () => {
  if (!newGroupName.trim() || selectedGroupMembers.length === 0) return;

  const groupData = {
    id: `group-${Date.now()}`,
    name: newGroupName,
    members: [...selectedGroupMembers, peerId],
    creator: peerId,
  };

  socket.emit("create-group", groupData);
  setNewGroupName("");
  setSelectedGroupMembers([]);
};
 // Send group message
 const sendGroupMessage = (groupId, message) => {
  if (!message.trim() || !groups.has(groupId)) return;

  socket.emit("group-message", {
    groupId,
    message,
    sender: peerId,
  });

  setGroupMessages((prev) => {
    const newMessages = new Map(prev);
    if (!newMessages.has(groupId)) {
      newMessages.set(groupId, []);
    }
    newMessages.get(groupId).push({ sender: "me", text: message, timestamp: Date.now() });
    return newMessages;
  });
};
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
  const acceptConnection = useCallback(
    (sourcePeerId) => {
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
            newConnections
              .get(conn.peer)
              .push({ sender: conn.peer, text: data });
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
              receivedAt: new Date(),
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
              type: "file",
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
    },
    [pendingConnections]
  );

  // Download received file
  const downloadFile = (peerId, fileIndex) => {
    const fileTransfer = fileTransfers.get(peerId)[fileIndex];
    const blob = new Blob([fileTransfer.fileData], {
      type: "application/octet-stream",
    });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = fileTransfer.fileName;
    link.click();
  };

  // Reject incoming connection
  const rejectConnection = useCallback(
    (sourcePeerId) => {
      const conn = pendingConnections.get(sourcePeerId);
      if (conn) {
        conn.close();
      }

      setPendingConnections((prev) => {
        const newPending = new Map(prev);
        newPending.delete(sourcePeerId);
        return newPending;
      });
    },
    [pendingConnections]
  );

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
            newConnections
              .get(targetPeerId)
              .push({ sender: targetPeerId, text: data });
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
              receivedAt: new Date(),
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
              type: "file",
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
    if (!peerId || !connections.has(peerId) || !messageInput.trim()) return;

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
          type: "file",
        });
        return newConnections;
      });
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      {!isNicknameSet ? (
        <Card className="w-full max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle>Set Your Nickname</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    submitNickname();
                  }
                }}
              />
              <Button onClick={submitNickname}>Join</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Peer-to-Peer Communication ({nickname})</span>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">New Group</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Group Name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                    <div>
                      <h4 className="mb-2">Select Members</h4>
                      <ScrollArea className="h-[200px] border rounded-lg p-2">
                        {connectedPeers.map((peer) => (
                          <div key={peer.peerId} className="flex items-center space-x-2 mb-2">
                            <input
                              type="checkbox"
                              checked={selectedGroupMembers.includes(peer.peerId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedGroupMembers((prev) => [...prev, peer.peerId]);
                                } else {
                                  setSelectedGroupMembers((prev) =>
                                    prev.filter((id) => id !== peer.peerId)
                                  );
                                }
                              }}
                            />
                            <span>{getNickname(peer.peerId)}</span>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                    <Button onClick={createGroup}>Create Group</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Pending Connections Section */}
            {pendingConnections.size > 0 && (
              <div className="mb-4 bg-gray-50 p-3 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Pending Connections</h3>
                {Array.from(pendingConnections.keys()).map((peerId) => (
                  <div key={peerId} className="flex items-center space-x-2 mb-2">
                    <Badge>{getNickname(peerId)}</Badge>
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
                <TabsTrigger value="groups">Groups</TabsTrigger>
              </TabsList>
              <TabsContent value="peers">
                <ScrollArea>
                  {connectedPeers.map((p) => (
                    <div key={p.peerId} className="flex justify-end space-x-2 mb-2">
                      <Badge>{getNickname(p.peerId)}</Badge>
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
              <TabsContent value="groups">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from(groups.values()).map((group) => (
                    <div key={group.id} className="border rounded-lg p-4">
                      <h3 className="text-xl font-bold mb-2 flex items-center">
                        {group.name}
                      </h3>
                      <ScrollArea className="h-[300px] border rounded-lg p-2 mb-4">
                        {(groupMessages.get(group.id) || []).map((msg, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg mb-2 ${
                              msg.sender === "me"
                                ? "bg-blue-100 text-right"
                                : "bg-gray-100 text-left"
                            }`}
                          >
                            <strong>{msg.sender === "me" ? "You" : getNickname(msg.sender)}:</strong> {msg.text}
                          </div>
                        ))}
                      </ScrollArea>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Type a message"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              sendGroupMessage(group.id, e.target.value);
                              e.target.value = "";
                            }
                          }}
                        />
                        <Button
                          onClick={(e) => {
                            const input = e.target.previousSibling;
                            sendGroupMessage(group.id, input.value);
                            input.value = "";
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
                      <Badge variant="secondary">{getNickname(peerId)}</Badge>
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                      <ScrollArea
                        className="border rounded-lg p-2"
                        style={{ maxHeight: "400px" }}
                      >
                        <div className="space-y-2">
                          {connections.get(peerId).map((msg, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded-lg ${
                                msg.sender === "me"
                                  ? "bg-blue-100 text-right"
                                  : "bg-gray-100 text-left"
                              }`}
                            >
                              <strong className="block mb-1">
                                {msg.sender === "me" ? "You" : getNickname(msg.sender)}:
                              </strong>
                              {msg.type === "file" ? (
                                <span className="text-blue-600">{msg.text}</span>
                              ) : (
                                <span>{msg.text}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* Rest of the component remains the same */}
                      <div className="border rounded-lg p-2 flex-auto">
                        <h3 className="font-bold mb-2 text-center">
                          Received Files
                        </h3>
                        {fileTransfers.get(peerId) ? (
                          <ScrollArea style={{ maxHeight: "400px" }}>
                            {fileTransfers.get(peerId).map((file, index) => (
                              <div
                                key={index}
                                className="flex-row mb-2 p-2 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center">
                                  <File className="mx-auto text-blue-500" />
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
                          <p className="text-gray-500 text-center">
                            No files received
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex space-x-2">
                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Type a message"
                        className="flex-grow"
                      />
                      <Button
                        onClick={() => sendMessage(peerId)}
                        className="px-4"
                      >
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
      )}
    </div>
  );
};

export default PeerConnectionManager;