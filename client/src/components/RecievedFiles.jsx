
import { Button } from "@/components/ui/button";
const ReceivedFiles = ({ peerId, fileTransfers, downloadFile }) => (
    <div>
      <h3>Received Files</h3>
      {fileTransfers.get(peerId) ? (
        fileTransfers.get(peerId).map((file, index) => (
          <div key={index}>
            <span>{file.fileName}</span>
            <Button onClick={() => downloadFile(peerId, index)}>Download</Button>
          </div>
        ))
      ) : (
        <p>No files received</p>
      )}
    </div>
  );
  