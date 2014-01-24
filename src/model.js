angular.module('angular-datastore').factory('AngularDataModelFactory', function() {

    return {

        get: function(configuration) {

            return function(AngularDataStore) {

                var o = {

                    __private: {
                        __relations: {},
                        __loadedRelations: {}
                    },

                    getType: function() {
                        return configuration.name;
                    },

                    getAttributes: function() {
                        return configuration.attributes;
                    },

                    getHasManyAttributes: function() {
                        return configuration.hasMany;
                    },

                    getHasOneAttributes: function() {
                        return configuration.hasOne;
                    }
                };

                if (configuration.type !== 'abstract') {
                    o.getPrimaryKeyAttribute = function() {
                        return configuration.primaryKey;
                    };

                    o.getPrimaryKey = function() {
                        return o[configuration.primaryKey];
                    };

                    o.isNew = function() {
                        return o.getPrimaryKey() === undefined || o.getPrimaryKey() === null;
                    };
                }

                // hasMany
                // @todo refactor by using an observable array for loadedHasMany to synchronise private hasMany
                angular.forEach(configuration.hasMany, function(relation, relationName) {

                    o.__private.__relations[relationName] = [];
                    o.__private.__loadedRelations[relationName] = [];

                    Object.defineProperty(o, relationName, {
                        get: function() {
                            switch (relation.type) {
                                case 'id':
                                    if (o.__private.__loadedRelations[relationName].length !== o.__private.__relations[relationName].length) {
                                        AngularDataStore.findMany(relation.target, o.__private.__relations[relationName]).then(function(newHasMany) {
                                            o.__private.__loadedRelations[relationName].splice(0,o.__private.__loadedRelations[relationName].length);
                                            angular.forEach(newHasMany, function(record) {
                                                o.__private.__loadedRelations[relationName].push(record);
                                            });
                                        });
                                    }
                                    return o.__private.__loadedRelations[relationName];
                                case 'embed':
                                    return o.__private.__relations[relationName];
                                default:
                                    throw 'unknown relation type ' + relation.type;
                            }
                        },

                        set: function(value) {
                            switch (relation.type) {
                                case 'id':
                                    var hasMany = [];
                                    angular.forEach(value, function(record) {
                                        hasMany.push(record.getPrimaryKey());
                                    });

                                    o.__private.__relations[relationName] = hasMany;
                                    o.__private.__loadedRelations[relationName] = value;
                                    break;
                                case 'embed':
                                    o.__private.__relations[relationName] = value;
                                    break;
                                default:
                                    throw 'unknown relation type ' + relation.type;
                            }
                        }
                    });
                });

                // hasOne
                // @todo refactor by using an observable array for loadedHasMany to synchronise private hasMany
                angular.forEach(configuration.hasOne, function(relation, relationName) {

                    o.__private.__relations[relationName] = null;
                    o.__private.__loadedRelations[relationName] = null;

                    Object.defineProperty(o, relationName, {
                        get: function() {
                            switch (relation.type) {
                                case 'id':
                                    if (o.__private.__loadedRelations[relationName] === null && o.__private.__relations[relationName]) {
                                        AngularDataStore.find(relation.target, o.__private.__relations[relationName]).then(function(newHasOne) {
                                            o.__private.__loadedRelations[relationName] = newHasOne;
                                        });
                                    }

                                    return o.__private.__loadedRelations[relationName];
                                case 'embed':
                                    return o.__private.__relations[relationName];
                                default:
                                    throw 'unknown relation type ' + relation.type;
                            }
                        },

                        set: function(value) {
                            switch (relation.type) {
                                case 'id':
                                    o.__private.__relations[relationName] = value.getPrimaryKey();
                                    o.__private.__loadedRelations[relationName] = value;
                                    break;
                                case 'embed':
                                    o.__private.__relations[relationName] = value;
                                    break;
                                default:
                                    throw 'unknown relation type ' + relation.type;
                            }
                        }
                    });
                });

                return o;

            };

        }

    };

});
