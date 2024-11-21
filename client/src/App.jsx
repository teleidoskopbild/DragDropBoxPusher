import { DndContext, DragOverlay } from "@dnd-kit/core";
import { useState, useEffect } from "react";
import Board from "./components/Board.jsx";
import Note from "./components/Note.jsx";
import pusher from "./pusher.js";

const mockNotes = [
  {
    id: "1",
    title: "Task 1",
    description: "Description for Task 1",
    status: "backlog",
  },
  {
    id: "2",
    title: "Task 2",
    description: "Description for Task 2",
    status: "in-progress",
  },
  {
    id: "3",
    title: "Task 3",
    description: "Description for Task 3",
    status: "done",
  },
  {
    id: "4",
    title: "Task 4",
    description: "Description for Task 4",
    status: "done",
  },
];

function App() {
  const [notes, setNotes] = useState(mockNotes);
  const [activeNote, setActiveNote] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [userLog, setUserLog] = useState([]);

  const boards = ["backlog", "in-progress", "done", "to-review"];

  useEffect(() => {
    const channel = pusher.subscribe("notes");

    channel.bind("noteMoved", ({ id, newStatus }) => {
      setNotes((prevNotes) => {
        // Duplikatprüfung: nur aktualisieren, wenn die Notiz existiert
        if (prevNotes.find((note) => note.id === id)) {
          return prevNotes.map((note) =>
            note.id === id ? { ...note, status: newStatus } : note
          );
        }
        return prevNotes; // Keine Änderungen, wenn die Notiz nicht existiert
      });
    });

    channel.bind("noteCreated", ({ id, title, description, status }) => {
      setNotes((prevNotes) => {
        // Duplikatprüfung: nur hinzufügen, wenn die ID noch nicht existiert
        if (!prevNotes.find((note) => note.id === id)) {
          return [...prevNotes, { id, title, description, status }];
        }
        return prevNotes; // Keine Duplikate
      });
    });

    channel.bind("logUpdated", ({ logMessage }) => {
      setUserLog((prevLog) => [...prevLog, logMessage]);
    });

    // Cleanup, wenn der Kanal nicht mehr benötigt wird
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  const handleDragStart = (event) => {
    const { active } = event;
    const note = notes.find((note) => note.id === active.id);
    setActiveNote(note);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveNote(null);
    if (over && active.id !== over.id) {
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === active.id ? { ...note, status: over.id } : note
        )
      );
      // Log-Nachricht erstellen, wenn eine Notiz verschoben wird
      // setUserLog((prevLog) => [
      //   ...prevLog,
      //   `${activeNote.title} wurde verschoben nach ${
      //     over.id
      //   } um ${new Date().toLocaleTimeString()}`,
      // ]);
      // Event an den Server senden
      fetch("http://localhost:4000/update-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: active.id,
          newStatus: over.id,
        }),
      });

      // Log-Nachricht an den Server senden
      fetch("http://localhost:4000/update-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          logMessage: `${activeNote.title} wurde verschoben nach ${
            over.id
          } um ${new Date().toLocaleTimeString()}`,
        }),
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newNote = {
      id: (notes.length + 1).toString(), // Generiere eine neue ID
      title: newTitle,
      description: newDescription,
      status: "backlog", // Neue Notiz landet im "backlog"
    };
    setNotes((prevNotes) => {
      // Duplikatprüfung: nur hinzufügen, wenn die ID noch nicht existiert
      if (!prevNotes.find((note) => note.id === newNote.id)) {
        return [...prevNotes, newNote];
      }
      return prevNotes; // Keine Duplikate
    });
    setNewTitle(""); // Eingabefelder zurücksetzen
    setNewDescription("");
    // Event an Pusher senden, um neue Notiz zu synchronisieren
    fetch("http://localhost:4000/create-note", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: newNote.id,
        title: newNote.title,
        description: newNote.description,
        status: newNote.status,
      }),
    });

    // Log-Nachricht an den Server senden
    fetch("http://localhost:4000/update-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        logMessage: `Neue Notiz ${
          newNote.title
        } wurde erstellt um ${new Date().toLocaleTimeString()}`,
      }),
    });

    // setUserLog((prevLog) => [
    //   ...prevLog,
    //   `Neue Notiz "${newTitle}" wurde um ${new Date().toLocaleTimeString()} erstellt`,
    // ]);
  };

  return (
    <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "300px",
          gap: "10px",
          margin: "20px",
        }}
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Titel"
          required
        />
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Beschreibung"
          required
        />
        <button type="submit">Notiz hinzufügen</button>
      </form>
      <div style={{ display: "flex", gap: "20px" }}>
        {boards.map((board) => (
          <Board
            key={board}
            title={board}
            notes={notes.filter((note) => note.status === board)}
          />
        ))}
        <h3>User Log</h3>
        <ul>
          {userLog.map((log, index) => (
            <li key={index}>{log}</li>
          ))}
        </ul>
      </div>

      <DragOverlay>
        {activeNote ? <Note note={activeNote} /> : null}{" "}
        {/* Overlay für das dragged Element */}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
