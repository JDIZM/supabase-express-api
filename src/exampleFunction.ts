export const exampleFunction = (...args: unknown[]) => {
  console.log("Hello world!", args);
  return ["Hello world!", ...args];
};
