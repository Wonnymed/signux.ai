"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Folder, Plus } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useProjects } from "../lib/useProjects";
import { useIsMobile } from "../lib/useIsMobile";
import Sidebar from "../components/Sidebar";
import {
  PageShell, PageHeader, EmptyState, SearchInput, AuthGate,
  ActionButton, InlineInput, CardGrid,
  Z800, Z700, Z600, Z200,
} from "../components/PageShell";

export default function ProjectsPage() {
  const router = useRouter();
  const { authUser } = useAuth();
  const isMobile = useIsMobile();
  const { projects, createProject } = useProjects(authUser?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<any>("chat");

  const filtered = projects.filter(p =>
    !p.archived && p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName("");
      setShowNewInput(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        mode={mode}
        setMode={setMode}
        profileName={authUser?.name || ""}
        lang="en"
        onNewConversation={() => router.push("/chat")}
        onOpenSettings={() => {}}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
        isLoggedIn={!!authUser}
        isMobile={isMobile}
        authUser={authUser}
        projects={projects}
      />

      <main style={{
        flex: 1,
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        minWidth: 0,
        overflowY: "auto",
        marginLeft: isMobile ? 0 : (sidebarOpen ? 260 : 56),
        transition: "margin-left 200ms ease",
      }}>
        <PageShell type="workspace">
          {!authUser ? (
            <AuthGate
              title="Sign in to use Projects"
              description="Organize your analyses, simulations, and intel reports into projects. Sign in to get started."
            />
          ) : (
            <>
              <PageHeader
                eyebrow="Workspace"
                title="Projects"
                subtitle="Organize your analyses and simulations."
                actions={
                  <ActionButton variant="filled" onClick={() => setShowNewInput(true)}>
                    <Plus size={14} strokeWidth={1.5} />
                    New Project
                  </ActionButton>
                }
              />

              {showNewInput && (
                <InlineInput
                  value={newProjectName}
                  onChange={setNewProjectName}
                  onSubmit={handleCreate}
                  onCancel={() => { setShowNewInput(false); setNewProjectName(""); }}
                  placeholder="Project name..."
                />
              )}

              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search projects..."
              />

              {filtered.length === 0 && !searchQuery ? (
                <EmptyState
                  title="No projects yet"
                  description="Create a project to organize your analyses, simulations, and intel reports."
                  icon={<Folder size={20} strokeWidth={1} style={{ color: Z600, opacity: 0.6 }} />}
                  action={
                    <ActionButton variant="ghost" onClick={() => setShowNewInput(true)}>
                      <Plus size={14} />
                      Create your first project
                    </ActionButton>
                  }
                />
              ) : filtered.length === 0 && searchQuery ? (
                <div style={{
                  padding: "60px 20px",
                  textAlign: "center",
                  color: Z600,
                  fontSize: 14,
                }}>
                  No projects matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <CardGrid>
                  {filtered.map(project => (
                    <div
                      key={project.id}
                      onClick={() => router.push(`/chat?project=${project.id}`)}
                      style={{
                        padding: 20,
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.015)",
                        border: `1px solid ${Z800}`,
                        cursor: "pointer",
                        transition: "all 180ms ease-out",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = Z700;
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = Z800;
                        e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: `${project.color || "#C8A84E"}10`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Folder size={16} style={{ color: project.color || "var(--accent)" }} />
                        </div>
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: Z200, marginBottom: 4, marginTop: 0 }}>
                        {project.name}
                      </h3>
                      <p style={{ fontSize: 12, color: Z600, margin: 0 }}>
                        {project.conversation_count || 0} conversations
                      </p>
                    </div>
                  ))}
                </CardGrid>
              )}
            </>
          )}
        </PageShell>
      </main>
    </div>
  );
}
