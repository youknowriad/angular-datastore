angular.module('angular-datastore').provider('AngularDataRestAdapter', {

    baseUrl: null,

    setBaseUrl: function (url) {
        this.baseUrl = url;
    },

    $get: ['$http', '$q', 'AngularDataSerializer', function ($http, $q, AngularDataSerializer) {

        var baseUrl = this.baseUrl,
            getUrlForType = function (type) {
                return baseUrl + '/' + type;
            };


        return {

            findAll: function (type) {
                var defer = $q.defer();
                $http.get(getUrlForType(type)).success(function (data) {
                    defer.resolve(data.data);
                }).error(function (data) {
                    defer.reject(data);
                });
                
                return defer.promise;
            },

            findMany: function (type, primaryKeys) {
                var globalPromise = $q.defer(),
                    promises = [],
                    results = [];
                angular.forEach(primaryKeys, function (primaryKey) {
                    promises.push(this.find(type, primaryKey).then(function (data) {
                        results.push(data);
                    }));
                }, this);

                $q.all(promises).then(function () {
                    globalPromise.resolve(results);
                }, function () {
                    globalPromise.reject(results);
                });

                return globalPromise.promise;
            },

            find: function (type, primaryKey) {
                var defer = $q.defer();
                $http.get(getUrlForType(type) + '/' + primaryKey).success(function (data) {
                    defer.resolve(data.data);
                }).error(function (data) {
                    defer.reject(data);
                });
                
                return defer.promise;
            },

            findQuery: function (type, filters) {
                var defer = $q.defer();
                $http({
                    method: 'GET',
                    url: getUrlForType(type),
                    params: filters
                }).success(function (data) {
                    defer.resolve(data.data);
                }).error(function (data) {
                    defer.reject(data);
                });
                
                return defer.promise;
            },

            remove: function (record) {
                var defer = $q.defer();
                $http.delete(getUrlForType(record.getType()) + '/' + record.getPrimaryKey()).success(function (data) {
                    defer.resolve(data.data);
                }).error(function (data) {
                    defer.reject(data);
                });
                
                return defer.promise;
            },

            update: function (record) {
                var defer = $q.defer();
                $http.put(getUrlForType(record.getType()) + '/' + record.getPrimaryKey(), AngularDataSerializer.serialize(record)).success(function (data) {
                    defer.resolve(data.data);
                }).error(function (data) {
                    defer.reject(data);
                });
                
                return defer.promise;
            },

            create: function (record) {
                var defer = $q.defer();
                $http.post(getUrlForType(record.getType()), AngularDataSerializer.serialize(record, false)).success(function (data) {
                    defer.resolve(data.data);
                }).error(function (data) {
                    defer.reject(data);
                });
                
                return defer.promise;
            }
        };

    }]

});
