import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentStore = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const store = request.store;

        if (!store) {
            return null;
        }

        return data ? store[data] : store;
    },
);
