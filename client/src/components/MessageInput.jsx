import "./src/index.css";
const MessageInput = ({ peerId, sendMessage, handleFileChange }) => {
    const fileInputRef = useRef(null);
    const [message, setMessage] = useState("");
  
    const handleSend = () => {
      sendMessage(peerId, message);
      setMessage("");
    };
  
    return (
      <div className="flex space-x-2">
        <Input value={message} onChange={(e) => setMessage(e.target.value)} />
        <Button colour="red !important"onClick={handleSend}>Send</Button>
        <Button onClick={() => fileInputRef.current.click()}>File</Button>
        <input ref={fileInputRef} type="file" hidden onChange={(e) => handleFileChange(e, peerId)} />
      </div>
    );
  };
  
  