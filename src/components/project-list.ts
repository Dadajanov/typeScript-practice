import { ProjectItem } from "./project-item.js";
import { DragTarget } from "../models/drag-drop.js";
import { Project } from "../models/project.js";
import { Component } from "./base-component.js";
import { autobind } from "../decorators/autobind.js";
import { projectState } from "../state/project-state.js";
import { ProjectStatus } from "../models/project.js";

// ProjectList Class
export class ProjectList
  extends Component<HTMLDivElement, HTMLElement>
  implements DragTarget
{
  assignedProjects: Project[];

  constructor(private type: "active" | "finished") {
    super("project-list", "app", false, `${type}-projects`);

    this.assignedProjects = [];

    projectState.addListener((projects: Project[]) => {
      const relevantProjects = projects.filter((project) => {
        if (this.type === "active") {
          return project.status === ProjectStatus.Active;
        }
        return project.status === ProjectStatus.Finished;
      });

      this.assignedProjects = relevantProjects;

      this.renderProjects();
    });

    this.configure();
    this.renderContent();
  }
  @autobind
  handleDragOver(event: DragEvent): void {
    if (event.dataTransfer && event.dataTransfer.types[0] === "text/plain") {
      event.preventDefault();
      const listEl = this.element.querySelector("ul")!;
      listEl.classList.add("droppable");
    }
  }

  @autobind
  handleDrop(event: DragEvent): void {
    const projectID = event.dataTransfer!.getData("text/plain");
    projectState.moveProject(
      projectID,
      this.type === "active" ? ProjectStatus.Active : ProjectStatus.Finished
    );
  }

  @autobind
  handleDragLeave(_: DragEvent): void {
    const listEl = this.element.querySelector("ul")!;
    listEl.classList.remove("droppable");
  }

  configure() {
    this.element.addEventListener("dragover", this.handleDragOver);
    this.element.addEventListener("dragleave", this.handleDragLeave);
    this.element.addEventListener("drop", this.handleDrop);

    projectState.addListener((projects: Project[]) => {
      const relevantProjects = projects.filter((project) => {
        if (this.type === "active") {
          return project.status === ProjectStatus.Active;
        }
        return project.status === ProjectStatus.Finished;
      });

      this.assignedProjects = relevantProjects;
    });
  }

  renderContent() {
    const listId = `${this.type}-projects-list`;
    this.element.querySelector("ul")!.id = listId;
    this.element.querySelector("h2")!.textContent =
      this.type.toUpperCase() + " PROJECTS";
  }

  private renderProjects() {
    const listEl = document.getElementById(
      `${this.type}-projects-list`
    )! as HTMLUListElement;
    listEl.innerHTML = "";

    for (const prjItem of this.assignedProjects) {
      new ProjectItem(this.element.querySelector("ul")!.id, prjItem);
      // const listItem = document.createElement("li");
      // listItem.textContent = prjItem.title;
      // listEl.appendChild(listItem);
    }
  }
}
