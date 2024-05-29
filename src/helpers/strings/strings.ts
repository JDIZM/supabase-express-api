export const camelCase = (str: string): string => {
  return str
    .split(" ")
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const pascalCase = (str: string): string => {
  return capitalize(camelCase(str));
};

export const titleCase = (str: string): string => {
  return str
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
};
