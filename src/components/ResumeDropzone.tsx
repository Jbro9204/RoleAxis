import { FileCheck2, FileText, LoaderCircle, LockKeyhole, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

export function ResumeDropzone({
  error,
  isProcessing,
  onFile
}: {
  error: string | null;
  isProcessing: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function selectFile(file?: File) {
    if (file && !isProcessing) onFile(file);
  }

  return (
    <div className="resumeIntake">
      <div
        className={`dropzone ${isDragging ? "dragging" : ""} ${error ? "hasError" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          selectFile(event.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          className="visuallyHidden"
          type="file"
          aria-label="Choose resume file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          onChange={(event) => selectFile(event.target.files?.[0])}
        />
        <div className="dropzoneIcon" aria-hidden="true">
          {isProcessing ? <LoaderCircle className="spin" size={26} /> : <UploadCloud size={26} />}
        </div>
        <div className="dropzoneCopy">
          <span className="sectionKicker">Private resume intake</span>
          <h2>{isProcessing ? "Reading your resume locally…" : "Bring the facts. We’ll build the campaign around them."}</h2>
          <p>
            {isProcessing
              ? "RoleAxis is extracting candidate facts. Nothing is being uploaded or submitted."
              : "Drop a PDF or DOCX here. You will review every extracted fact before RoleAxis is allowed to use it."}
          </p>
        </div>
        <button className="actionButton primary" type="button" onClick={() => inputRef.current?.click()} disabled={isProcessing}>
          {isProcessing ? "Reviewing document" : "Choose resume"}
          {!isProcessing ? <FileText size={17} aria-hidden="true" /> : null}
        </button>
        <span className="dropzoneMeta">PDF, DOCX, TXT, or Markdown · 12 MB maximum</span>
      </div>

      {error ? (
        <div className="inlineMessage error" role="alert">
          <strong>We stopped before creating a profile.</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <div className="privacySequence" aria-label="Resume privacy sequence">
        <div>
          <span className="sequenceIcon"><LockKeyhole size={17} aria-hidden="true" /></span>
          <strong>Processed here</strong>
          <p>Text extraction happens in this browser.</p>
        </div>
        <span className="sequenceLine" aria-hidden="true" />
        <div>
          <span className="sequenceIcon"><FileCheck2 size={17} aria-hidden="true" /></span>
          <strong>Verified by you</strong>
          <p>No extracted fact starts as approved.</p>
        </div>
        <span className="sequenceLine" aria-hidden="true" />
        <div>
          <span className="sequenceIcon"><UploadCloud size={17} aria-hidden="true" /></span>
          <strong>Source discarded</strong>
          <p>The original file is not kept in the draft.</p>
        </div>
      </div>
    </div>
  );
}
