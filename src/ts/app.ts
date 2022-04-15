/// <reference path="drag-drop-interfaces.ts"/>
/// <reference path="projact-modal.ts"/>

namespace App {
  // Project state management
  type Listener = (items: Project[]) => void;

  class ProjectState {
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

  const projectState = ProjectState.getInstance();

  // Validation
  interface Validatable {
    value: string | number;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  }

  const validate = (validatableInput: Validatable) => {
    let isValid = true;

    // checking inputs which return stirng
    if (validatableInput.required) {
      isValid =
        isValid && validatableInput.value.toString().trim().length !== 0;
    }
    if (
      validatableInput.minLength != null &&
      typeof validatableInput.value === "string"
    ) {
      isValid =
        isValid && validatableInput.value.length >= validatableInput.minLength;
    }
    if (
      validatableInput.maxLength != null &&
      typeof validatableInput.value === "string"
    ) {
      isValid =
        isValid && validatableInput.value.length <= validatableInput.maxLength;
    }

    //checking input which return numbers
    if (
      validatableInput.min != null &&
      typeof validatableInput.value === "number"
    ) {
      isValid = isValid && validatableInput.value >= validatableInput.min;
    }
    if (
      validatableInput.max != null &&
      typeof validatableInput.value === "number"
    ) {
      isValid = isValid && validatableInput.value <= validatableInput.max;
    }

    return isValid;
  };

  //autobind decorator
  const autobind = (
    _target: any,
    _methodName: string,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value;
    const adjDescriptor: PropertyDescriptor = {
      configurable: true,
      get() {
        const boundFn = originalMethod.bind(this);
        return boundFn;
      },
    };
    return adjDescriptor;
  };

  // Component Base Class
  abstract class Component<T extends HTMLElement, U extends HTMLElement> {
    templateElement: HTMLTemplateElement;
    hostElement: T;
    element: U;

    constructor(
      temlateId: string,
      hostElement: string,
      insertAtStart: boolean,
      newElementId?: string
    ) {
      this.templateElement = document.getElementById(
        temlateId
      )! as HTMLTemplateElement;
      this.hostElement = document.getElementById(hostElement)! as T;

      const importedNode = document.importNode(
        this.templateElement.content,
        true
      );
      this.element = importedNode.firstElementChild as U;

      if (newElementId) {
        this.element.id = newElementId;
      }
      this.attach(insertAtStart);
    }

    private attach(insertAtBegining: boolean) {
      this.hostElement.insertAdjacentElement(
        insertAtBegining ? "afterbegin" : "beforeend",
        this.element
      );
    }

    abstract configure?(): void;
    abstract renderContent?(): void;
  }

  // ProjectItem Class
  class ProjectItem
    extends Component<HTMLUListElement, HTMLLIElement>
    implements Draggable
  {
    private project: Project;

    get persons() {
      if (this.project.people === 1) {
        return "1 person ";
      } else {
        return `${this.project.people} persons `;
      }
    }
    constructor(hostId: string, project: Project) {
      super("single-project", hostId, true, project.id);
      this.project = project;

      this.configure();
      this.renderContent();
    }

    @autobind
    handleDragStart(event: DragEvent) {
      event.dataTransfer!.setData("text/plain", this.project.id);
      event.dataTransfer!.effectAllowed = "move";
    }
    @autobind
    handleDragEnd(event: DragEvent) {
      console.log(event);
    }

    configure() {
      this.element.addEventListener("dragstart", this.handleDragStart);
      this.element.addEventListener("dragend", this.handleDragEnd);
    }

    renderContent() {
      (this.element.querySelector("h2")!.textContent = this.project.title),
        (this.element.querySelector("h3")!.textContent =
          this.persons + "assigned"),
        (this.element.querySelector("p")!.textContent =
          this.project.description);
    }
  }
  // ProjectList Class
  class ProjectList
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

  //ProjectInput class
  class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
    titleInputElement: HTMLInputElement;
    descriptionInputElement: HTMLInputElement;
    peopleInputElement: HTMLInputElement;

    constructor() {
      super("project-input", "app", true, "user-input");

      this.titleInputElement = this.element.querySelector(
        "#title"
      )! as HTMLInputElement;
      this.descriptionInputElement = this.element.querySelector(
        "#description"
      )! as HTMLInputElement;
      this.peopleInputElement = this.element.querySelector(
        "#people"
      )! as HTMLInputElement;
      this.configure();
    }

    configure() {
      this.element.addEventListener("submit", this.handleSubmit);
    }

    renderContent() {}

    private getUserInput(): [string, string, number] | void {
      const enteredTitle = this.titleInputElement.value;
      const enteredDescription = this.descriptionInputElement.value;
      const enteredPeople = this.peopleInputElement.value;

      const titleValidatable: Validatable = {
        value: enteredTitle,
        required: true,
        minLength: 2,
      };
      const descriptionValidatable: Validatable = {
        value: enteredDescription,
        required: true,
        minLength: 5,
      };
      const peopleValidatable: Validatable = {
        value: Number(enteredPeople),
        required: true,
        min: 1,
        max: 5,
      };
      if (
        !validate(titleValidatable) ||
        !validate(descriptionValidatable) ||
        !validate(peopleValidatable)
      ) {
        alert("Invalid input, please try again!");
      } else {
        return [enteredTitle, enteredDescription, Number(enteredPeople)];
      }
    }

    private clearInput() {
      this.titleInputElement.value = "";
      this.descriptionInputElement.value = "";
      this.peopleInputElement.value = "";
    }

    @autobind
    private handleSubmit(event: Event) {
      event.preventDefault();
      const userInput = this.getUserInput();
      if (Array.isArray(userInput)) {
        const [title, desc, people] = userInput;
        projectState.addProject(title, desc, people);
        this.clearInput();
      }
    }
  }

  new ProjectInput();
  new ProjectList("active");
  new ProjectList("finished");
}
