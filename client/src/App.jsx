
import './App.css';
import io from "socket.io-client"
import PeerConnection from './peercomp';

function App() {
const socket =io.connect("http://localhost:3000");
  return (
    <div className="App">
      <PeerConnection/>
    </div>
  );
}

export default App;
