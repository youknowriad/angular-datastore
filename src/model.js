angular.module('angular-datastore').factory('AngularDataModelFactory', function() {

    return {

        get: function(configuration) {

            return function(AngularDataStore) {

                var o = {

                    __private: {
                        __hasMany: {},
                        __loadedHasMany: {}
                    },

                    getType: function() {
                        return configuration.name;
                    },

                    getPrimaryKey: function() {
                        return this[configuration.primaryKey];
                    },

                    getAttributes: function() {
                        return configuration.attributes;
                    },

                    getHasManyAttributes: function() {
                        return configuration.hasMany;
                    },

                    getPrimaryKeyAttribute: function() {
                        return configuration.primaryKey;
                    },

                    isNew: function() {
                        return this.getPrimaryKey() === undefined || this.getPrimaryKey() === null;
                    }
                };

                // hasMany
                // @todo refactor by using an observable array for loadedHasMany to synchronise private hasMany
                angular.forEach(configuration.hasMany, function(relationTarget, relationName) {

                    o.__private.__hasMany[relationName] = [];
                    o.__private.__loadedHasMany[relationName] = [];

                    Object.defineProperty(o, relationName, {
                        get: function() {
                            if (o.__private.__loadedHasMany[relationName].length !== o.__private.__hasMany[relationName].length) {
                                AngularDataStore.findMany(relationTarget, o.__private.__hasMany[relationName]).then(function(newHasMany) {
                                    o.__private.__loadedHasMany[relationName].splice(0,o.__private.__loadedHasMany[relationName].length);
                                    angular.forEach(newHasMany, function(record) {
                                        o.__private.__loadedHasMany[relationName].push(record);
                                    });
                                });
                            }

                            return o.__private.__loadedHasMany[relationName];
                        },

                        set: function(value) {
                            var hasMany = [];
                            angular.forEach(value, function(record) {
                                hasMany.push(record.getPrimaryKey());
                            });

                            o.__private.__hasMany[relationName] = hasMany;
                            o.__private.__loadedHasMany[relationName] = value;
                        }
                    });
                });

                return o;

            };

        }

    };

});
