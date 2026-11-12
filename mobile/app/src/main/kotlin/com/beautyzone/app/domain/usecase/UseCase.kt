package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Resource

/**
 * Single-action use case. Implementations are stateless and suspend-safe.
 */
abstract class UseCase<in Params, out R> {
    abstract suspend operator fun invoke(params: Params): Resource<R>
}

typealias NoParams = Unit
