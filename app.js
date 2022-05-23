const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const isValid = require("date-fns/isValid");
const format = require("date-fns/format");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertTodoDbObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndPriorityProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasDueDateProperty = (requestQuery) => {
  return requestQuery.dueDate !== undefined;
};

const hasTodoProperty = (requestQuery) => {
  return requestQuery.todo !== undefined;
};

const validStatus = (status) => {
  return status === "TO DO" || status === "DONE" || status === "IN PROGRESS";
};

const validPriority = (priority) => {
  return priority === "HIGH" || priority === "MEDIUM" || priority === "LOW";
};

const validCategory = (category) => {
  return category === "WORK" || category === "HOME" || category === "LEARNING";
};

const validDueDate = (dueDate) => {
  var parts = dueDate.split("-");
  var checkDate = new Date(
    parseInt(parts[0]),
    parseInt(parts[1]) - 1,
    parseInt(parts[2])
  );
  var checkDateString = format(checkDate, "yyyy-MM-dd");
  return checkDateString === dueDate;
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let valid = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;
  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      if (validPriority(priority)) {
        if (validStatus(status)) {
          getTodosQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND status = '${status}' AND priority = '${priority}';`;
          valid = "valid";
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasCategoryAndStatusProperties(request.query):
      if (validCategory(category)) {
        if (validStatus(status)) {
          getTodosQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND status = '${status}' AND category = '${category}';`;
          valid = "valid";
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasCategoryAndPriorityProperties(request.query):
      if (validCategory(category)) {
        if (validPriority(priority)) {
          getTodosQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND priority = '${priority}' AND category = '${category}';`;
          valid = "valid";
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasPriorityProperty(request.query):
      if (validPriority(priority)) {
        getTodosQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND priority = '${priority}';`;
        valid = "valid";
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasStatusProperty(request.query):
      if (validStatus(status)) {
        getTodosQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND status = '${status}';`;
        valid = "valid";
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasCategoryProperty(request.query):
      if (validCategory(category)) {
        getTodosQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND category = '${category}';`;
        valid = "valid";
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    default:
      getTodosQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%';`;
      valid = "valid";
  }
  if (valid) {
    data = await database.all(getTodosQuery);
    response.send(
      data.map((eachTodo) => convertTodoDbObjectToResponseObject(eachTodo))
    );
  }
});
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = ` SELECT * FROM todo WHERE id = ${todoId};`;
  const todoObject = await database.get(getTodoQuery);
  response.send(convertTodoDbObjectToResponseObject(todoObject));
});

app.post("/todos/", async (request, response) => {
  const { todo, category, priority, status, dueDate } = request.body;
  if (
    validPriority(priority) &&
    validStatus(status) &&
    validCategory(category)
  ) {
    const postTodoQuery = ` INSERT INTO todo (todo, category, priority, status, due_date) VALUES ('${todo}', '${category}', '${priority}', '${status}', ${dueDate});`;
    const todoData = await database.run(postTodoQuery);
    response.send("Todo Successfully Added");
  } else {
    response.status(400);
    switch (true) {
      case !validCategory(category):
        response.send("Invalid Todo Category");
        break;
      case !validPriority(priority):
        response.send("Invalid Todo Priority");
        break;
      case !validStatus(status):
        response.send("Invalid Todo Status");
        break;
    }
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { todo, category, priority, status, dueDate } = request.body;
  let message = "";
  let updateTodoQuery = "";
  switch (true) {
    case hasCategoryProperty(request.body):
      console.log(category);
      if (validCategory(category)) {
        console.log(category);
        updateTodoQuery = `UPDATE todo SET category = '${category}' WHERE id = ${todoId};`;
        message = "Category Updated";
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasPriorityProperty(request.body):
      if (validPriority(priority)) {
        updateTodoQuery = `UPDATE todo SET priority = '${priority}' WHERE id = ${todoId};`;
        message = "Priority Updated";
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasStatusProperty(request.body):
      if (validStatus(status)) {
        updateTodoQuery = `UPDATE todo SET status = '${status}' WHERE id = ${todoId};`;
        message = "Status Updated";
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasDueDateProperty(request.body):
      if (validDueDate(dueDate)) {
        updateTodoQuery = `UPDATE todo SET due_date = ${dueDate} WHERE id = ${todoId};`;
        message = "Due Date Updated";
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
    case hasTodoProperty(request.body):
      updateTodoQuery = `UPDATE todo SET todo = '${todo}' WHERE id = ${todoId};`;
      message = "Todo Updated";
      break;
  }
  if (message) {
    await database.run(updateTodoQuery);
    response.send(message);
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM todo WHERE id = ${todoId};`;
  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});
module.exports = app;
