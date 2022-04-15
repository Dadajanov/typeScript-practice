namespace App {
  // Project state management
  type Listener = (items: Project[]) => void;

  export class ProjectState {
    private listeners: Listener[] = [];
    private projects: Project[] = [];
    private static instance: ProjectState;
    private constructor() {}

    static getInstance() {
      if (this.instance) {
        return this.instance;
      }
      this.instance = new ProjectState();
      return this.instance;
    }

    addListener(listenerFn: Listener) {
      this.listeners.push(listenerFn);
    }

    addProject(title: string, description: string, numberOfPeople: number) {
      const newProject = new Project(
        Math.random().toString(),
        title,
        description,
        numberOfPeople,
        ProjectStatus.Active
      );
      this.projects.push(newProject);

      for (const listenerFn of this.listeners) {
        listenerFn(this.projects.slice());
      }
      this.updateListeners();
    }

    moveProject(projectID: string, newStatus: ProjectStatus) {
      const project = this.projects.find((project) => project.id === projectID);

      if (project && project.status !== newStatus) {
        project.status = newStatus;
        this.updateListeners();
      }
    }

    private updateListeners() {
      for (const listenerFn of this.listeners) {
        listenerFn(this.projects.slice());
      }
    }
  }

  export const projectState = ProjectState.getInstance();
}
