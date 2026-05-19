/**
 * Finds a single document by its _id.
 * Supports optional field selection, population of referenced docs, and lean mode.
 * Returns null if no document with the given id exists.
 * @param {String} id - The document's _id value
 * @param {String} select - Fields to include/exclude (e.g. '-password')
 * @param {Object} options - Query options:
 *   @param {String|Object} options.populate - Field(s) to populate with referenced documents
 *   @param {Boolean} options.lean - If true, returns a plain JS object instead of a Mongoose document
 * @param {Object} model - Mongoose model to query
 */
export const findById = async ({ id, options, select, model }) => {
  const doc = model.findById(id).select(select || "");
  if (options?.populate) {
    doc.populate(options.populate);
  }
  if (options?.lean) {
    doc.lean(options.lean);
  }
  return await doc.exec();
};

/**
 * Finds the first document matching the given filter.
 * Supports optional field selection, population of referenced docs, and lean mode.
 * Returns null if no matching document is found.
 * @param {Object} filter - Conditions to match (e.g. { email: 'a@b.com' })
 * @param {String} select - Fields to include/exclude (e.g. '-password')
 * @param {Object} options - Query options:
 *   @param {String|Object} options.populate - Field(s) to populate with referenced documents
 *   @param {Boolean} options.lean - If true, returns a plain JS object instead of a Mongoose document
 * @param {Object} model - Mongoose model to query
 */
export const findOne = async ({ filter, options, select, model } = {}) => {
  const doc = model.findOne(filter).select(select || "");
  if (options?.populate) {
    doc.populate(options.populate);
  }
  if (options?.lean) {
    doc.lean(options.lean);
  }
  return await doc.exec();
};

/**
 * Finds all documents matching the given filter.
 * Supports field selection, population, pagination via skip/limit, and lean mode.
 * Returns an empty array if no documents are found.
 * @param {Object} filter - Conditions to match (e.g. { isActive: true })
 * @param {String} select - Fields to include/exclude
 * @param {Object} options - Query options:
 *   @param {String|Object} options.populate - Field(s) to populate with referenced documents
 *   @param {Number} options.skip - Number of documents to skip
 *   @param {Number} options.limit - Max number of documents to return
 *   @param {Boolean} options.lean - If true, returns plain JS objects instead of Mongoose documents
 * @param {Object} model - Mongoose model to query
 */
export const find = async ({ filter, options, select, model } = {}) => {
  const doc = model.find(filter || {}).select(select || "");
  if (options?.populate) {
    doc.populate(options.populate);
  }
  if (options?.skip) {
    doc.skip(options.skip);
  }
  if (options?.limit) {
    doc.limit(options.limit);
  }
  if (options?.lean) {
    doc.lean(options.lean);
  }
  return await doc.exec();
};

/**
 * Returns a paginated result set with metadata.
 * When page is "all", returns all matching documents without pagination.
 * When a page number is given, calculates skip/limit and returns total count and page info.
 * Returns: { docsCount, limit, pages, currentPage, result }
 * @param {Object} filter - Conditions to match
 * @param {Object} options - Extra query options passed through to find() (populate, lean, etc.)
 * @param {String} select - Fields to include/exclude
 * @param {Number|"all"} page - Page number (1-based), or "all" to skip pagination
 * @param {Number} size - Number of documents per page (default: 5)
 * @param {Object} model - Mongoose model to query
 */
export const paginate = async ({
  filter = {},
  options = {},
  select,
  page = "all",
  size = 5,
  model,
} = {}) => {
  let docsCount = undefined;
  let pages = undefined;
  if (page !== "all") {
    page = Math.floor(page < 1 ? 1 : page);
    options.limit = Math.floor(size < 1 || !size ? 5 : size);
    options.skip = (page - 1) * options.limit;
    docsCount = await model.countDocuments(filter);
    pages = Math.ceil(docsCount / options.limit);
  }
  const result = await find({ model, filter, select, options });
  return {
    docsCount,
    limit: options.limit,
    pages,
    currentPage: page !== "all" ? page : undefined,
    result,
  };
};

/**
 * Inserts one or more documents into the collection.
 * Accepts a single object or an array of objects as data.
 * Triggers Mongoose middleware and schema validation.
 * Returns an empty array if creation fails.
 * @param {Object|Array} data - Document(s) to insert
 * @param {Object} options - Additional Mongoose create options
 * @param {Object} model - Mongoose model to insert into
 */
export const create = async ({ data, options, model }) => {
  return (await model.create(data, options)) || [];
};

/**
 * Creates and saves a single document using new model() + save().
 * Unlike create(), this gives you access to the document instance before saving,
 * which is useful for calling instance methods or setting virtual fields first.
 * Triggers all pre/post save middleware.
 * @param {Object} data - Document fields to set
 * @param {Object} options - Options passed to doc.save() (e.g. { validateBeforeSave: false })
 * @param {Object} model - Mongoose model to instantiate
 */
export const createOne = async ({ data, options, model } = {}) => {
  const doc = new model(data);
  return await doc.save(options);
};

/**
 * Inserts multiple documents in a single optimized operation.
 * Faster than create() for bulk inserts since it skips some Mongoose middleware.
 * Note: does NOT trigger pre/post save hooks — use create() if hooks are needed.
 * @param {Array} data - Array of documents to insert
 * @param {Object} model - Mongoose model to insert into
 */
export const insertMany = async ({ data, model }) => {
  return await model.insertMany(data);
};

/**
 * Updates the first document matching the filter.
 * Automatically increments the __v (version) field on every update.
 * Supports both standard update objects and aggregation pipeline arrays.
 * When update is an array (pipeline), appends a $set stage to bump __v and
 * enables updatePipeline mode with runValidators.
 * Returns a write result with matchedCount and modifiedCount (not the document itself).
 * @param {Object} filter - Conditions to match the target document
 * @param {Object|Array} update - Update operations or aggregation pipeline stages
 * @param {Object} options - Additional Mongoose update options
 * @param {Object} model - Mongoose model to update
 */
export const updateOne = async ({ filter, update, options, model } = {}) => {
  if (Array.isArray(update)) {
    update.push({
      $set: {
        __v: { $add: ["$__v", 1] },
      },
    });
    return await model.updateOne(filter || {}, update, {
      ...options,
      runValidators: true,
      updatePipeline: true,
    });
  }

  const { $inc, ...restUpdate } = update;
  return await model.updateOne(
    filter || {},
    {
      ...restUpdate,
      $inc: { ...$inc, __v: 1 }, // merge caller's $inc with __v increment
    },
    options,
  );
};

/**
 * Finds the first document matching the filter, updates it, and returns it.
 * Automatically increments the __v (version) field on every update.
 * Returns the updated document by default (new: true).
 * Supports both standard update objects and aggregation pipeline arrays.
 * When update is an array (pipeline), appends a $set stage to bump __v and
 * enables updatePipeline + runValidators automatically.
 * Returns null if no matching document is found.
 * @param {Object} filter - Conditions to match the target document
 * @param {Object|Array} update - Update operations or aggregation pipeline stages
 * @param {Object} options - Mongoose options (new, runValidators, etc.)
 * @param {Object} model - Mongoose model to update
 */
export const findOneAndUpdate = async ({
  filter,
  update,
  options,
  model,
} = {}) => {
  if (Array.isArray(update)) {
    update.push({
      $set: {
        __v: { $add: ["$__v", 1] },
      },
    });
    return await model.findOneAndUpdate(filter || {}, update, {
      new: true,
      runValidators: true,
      ...options,
      updatePipeline: true,
    });
  }
  return await model.findOneAndUpdate(
    filter || {},
    { ...update, $inc: { __v: 1 } },
    {
      new: true,
      runValidators: true,
      ...options,
    },
  );
};

/**
 * Finds a document by its _id, updates it, and returns it.
 * Automatically increments the __v (version) field on every update.
 * Returns the updated document by default (new: true).
 * Returns null if no document with the given id exists.
 * @param {String} id - The document's _id value
 * @param {Object} update - Update operations (e.g. { $set: { status: 'active' } })
 * @param {Object} options - Mongoose options (default: { new: true })
 * @param {Object} model - Mongoose model to update
 */
export const findByIdAndUpdate = async ({
  id,
  update,
  options = { new: true },
  model,
}) => {
  return await model.findByIdAndUpdate(
    id,
    { ...update, $inc: { __v: 1 } },
    options,
  );
};

/**
 * Deletes the first document matching the filter.
 * Returns a write result with deletedCount (not the deleted document).
 * Use findOneAndDelete() instead if you need the deleted document returned.
 * @param {Object} filter - Conditions to match the target document
 * @param {Object} model - Mongoose model to delete from
 */
export const deleteOne = async ({ filter, model }) => {
  return await model.deleteOne(filter || {});
};

/**
 * Deletes all documents matching the filter in a single operation.
 * Returns a write result with deletedCount.
 * Pass an empty filter {} with caution — it will wipe the entire collection.
 * @param {Object} filter - Conditions to match target documents
 * @param {Object} model - Mongoose model to delete from
 */
export const deleteMany = async ({ filter, model }) => {
  return await model.deleteMany(filter || {});
};

/**
 * Finds the first document matching the filter, deletes it, and returns it.
 * Unlike deleteOne(), this returns the deleted document rather than a write result.
 * Useful when you need to confirm what was deleted or use its data after removal.
 * Returns null if no matching document is found.
 * @param {Object} filter - Conditions to match the target document
 * @param {Object} model - Mongoose model to delete from
 */
export const findOneAndDelete = async ({ filter, model } = {}) => {
  return await model.findOneAndDelete(filter || {});
};

/**
 * Finds a document by its _id, deletes it, and returns it.
 * Unlike deleteOne(), this returns the deleted document rather than a write result.
 * Returns null if no document with the given id exists.
 * @param {String} id - The document's _id value
 * @param {Object} model - Mongoose model to delete from
 */
export const findByIdAndDelete = async ({ id, model } = {}) => {
  return await model.findByIdAndDelete(id);
};

/**
 * Updates all documents matching the filter in a single operation.
 * Automatically increments the __v (version) field on every matched document.
 * Supports both standard update objects and aggregation pipeline arrays.
 * Returns a write result with matchedCount and modifiedCount (not the documents themselves).
 * Use find() after if you need the updated documents.
 * @param {Object} filter - Conditions to match target documents
 * @param {Object|Array} update - Update operations or aggregation pipeline stages
 * @param {Object} options - Additional Mongoose update options
 * @param {Object} model - Mongoose model to update
 */
export const updateMany = async ({ filter, update, options, model } = {}) => {
  if (Array.isArray(update)) {
    update.push({
      $set: {
        __v: { $add: ["$__v", 1] },
      },
    });
    return await model.updateMany(filter || {}, update, {
      ...options,
      runValidators: true,
      updatePipeline: true,
    });
  }
  return await model.updateMany(
    filter || {},
    { ...update, $inc: { __v: 1 } },
    options,
  );
};

/**
 * Returns the number of documents matching the filter.
 * Uses countDocuments which is filter-aware and always accurate.
 * Pass an empty filter {} to count all documents in the collection.
 * @param {Object} filter - Conditions to match (e.g. { isActive: true })
 * @param {Object} options - Additional Mongoose options
 * @param {Object} model - Mongoose model to count from
 */
export const countDocuments = async ({ filter, options, model } = {}) => {
  return await model.countDocuments(filter || {}, options);
};

/**
 * Checks whether at least one document matching the filter exists.
 * Returns the _id of the first match if found, or null if not.
 * More efficient than findOne() when you only need a yes/no answer
 * since it stops as soon as a match is found and returns only the _id.
 * @param {Object} filter - Conditions to match
 * @param {Object} model - Mongoose model to check
 */
export const exists = async ({ filter, model } = {}) => {
  return await model.exists(filter || {});
};

/**
 * Runs a MongoDB aggregation pipeline on the collection.
 * Use for complex queries: grouping, joining collections ($lookup),
 * computed fields, analytics, or reshaping data beyond what find() supports.
 * Returns an array of results shaped by the pipeline stages.
 * @param {Array} pipeline - Array of aggregation stage objects (e.g. [$match, $group, $project])
 * @param {Object} options - Additional Mongoose aggregation options
 * @param {Object} model - Mongoose model to aggregate on
 */
export const aggregate = async ({ pipeline, options, model } = {}) => {
  return await model.aggregate(pipeline || [], options);
};

/**
 * Executes multiple write operations (insert, update, delete) in a single request.
 * More efficient than running individual operations in a loop since it reduces round trips.
 * Returns a BulkWriteResult with counts per operation type (insertedCount, modifiedCount, etc.).
 * @param {Array} operations - Array of write operation objects, e.g.:
 *   [
 *     { insertOne: { document: { name: 'Alice' } } },
 *     { updateOne: { filter: { name: 'Bob' }, update: { $set: { age: 30 } } } },
 *     { deleteOne: { filter: { name: 'Charlie' } } }
 *   ]
 * @param {Object} options - Additional Mongoose bulkWrite options
 * @param {Object} model - Mongoose model to write to
 */
export const bulkWrite = async ({ operations, options, model } = {}) => {
  return await model.bulkWrite(operations || [], options);
};

/**
 * Returns an array of unique values for a given field across all matching documents.
 * Useful for getting all possible values of a field (e.g. all unique tags, roles, or statuses).
 * @param {String} field - The field to get distinct values for (e.g. 'category')
 * @param {Object} filter - Conditions to narrow down which documents to consider
 * @param {Object} model - Mongoose model to query
 */
export const distinct = async ({ field, filter, model } = {}) => {
  return await model.distinct(field, filter || {});
};

/**
 * Replaces the entire first document matching the filter with a new one.
 * Unlike updateOne(), this removes all existing fields and substitutes the full document.
 * The _id field is preserved. Returns a write result with matchedCount and modifiedCount.
 * Use findOneAndReplace() instead if you need the resulting document returned.
 * @param {Object} filter - Conditions to match the target document
 * @param {Object} replacement - The full replacement document (no update operators)
 * @param {Object} options - Additional Mongoose options
 * @param {Object} model - Mongoose model to replace in
 */
export const replaceOne = async ({
  filter,
  replacement,
  options,
  model,
} = {}) => {
  return await model.replaceOne(filter || {}, replacement || {}, options);
};

/**
 * Finds the first document matching the filter, replaces it entirely, and returns it.
 * Unlike findOneAndUpdate(), this swaps the whole document instead of merging fields.
 * The _id field is preserved. Returns the resulting document by default (new: true).
 * Returns null if no matching document is found.
 * @param {Object} filter - Conditions to match the target document
 * @param {Object} replacement - The full replacement document (no update operators)
 * @param {Object} options - Mongoose options (default: { new: true, runValidators: true })
 * @param {Object} model - Mongoose model to replace in
 */
export const findOneAndReplace = async ({
  filter,
  replacement,
  options = { new: true, runValidators: true },
  model,
} = {}) => {
  return await model.findOneAndReplace(
    filter || {},
    replacement || {},
    options,
  );
};

/**
 * Returns a fast estimated count of all documents in the collection.
 * Uses collection metadata instead of scanning documents, so it is much faster
 * than countDocuments() on large collections but does NOT support filters.
 * Use countDocuments() when you need a filtered or exact count.
 * @param {Object} options - Additional Mongoose options
 * @param {Object} model - Mongoose model to count from
 */
export const estimatedDocumentCount = async ({ options, model } = {}) => {
  return await model.estimatedDocumentCount(options);
};
