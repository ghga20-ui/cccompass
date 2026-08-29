function readPackage(pkg) {
  if (pkg.name === "kordoc") {
    delete pkg.optionalDependencies;
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
